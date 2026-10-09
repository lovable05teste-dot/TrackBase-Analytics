import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { dispatchCapi } from '../lib/meta-capi.ts';

const require = createRequire(import.meta.url);
const sha = v => createHash('sha256').update(v).digest('hex');
const ws = 'ws_' + sha('owner').slice(0,24);
const plugins = [{ name:'fixtures', setup(b) {
  b.onResolve({filter:/(?:^@\/db$|\/db$)/}, () => ({path:'db',namespace:'fixture'}));
  b.onResolve({filter:/trackbase-security$/}, () => ({path:'security',namespace:'fixture'}));
  b.onResolve({filter:/lib\/push$/}, () => ({path:'push',namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'}, args => ({ contents: {
    db: 'export function getDb(){return globalThis.__capiDb;} export async function ensureDb(){}',
    security: `export async function decryptSecret(){if(globalThis.__decryptFails)throw Error('bad encryption');return 'test-token';}
export async function sha256(v){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v));return Array.from(new Uint8Array(d)).map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function requestUserId(r){return r.headers.get('x-test-user');}
export function hasConflictingOrigin(r){return !!r.headers.get('origin')&&r.headers.get('origin')!==new URL(r.url).origin;}`,
    push: 'export async function notifySale(){globalThis.__notifications++;} export async function recordSaleEvent(){} export async function pushToWorkspace(){}'
  }[args.path] }));
}}];
async function load(path) {
  const built = await build({entryPoints:[path],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',plugins,logLevel:'silent'});
  const m={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(require,m,m.exports);return m.exports;
}
const gateway = await load('app/api/webhooks/gateway/route.ts');
const utmify = await load('app/api/webhooks/utmify/route.ts');
const ingest = await load('lib/sale-ingest.ts');
const diagnostics = await load('app/api/meta/capi-deliveries/route.ts');
const realFetch = globalThis.fetch;
let sql, calls, response, originalSecret;
beforeEach(() => {
  sql = new DatabaseSync(':memory:');
  const src=readFileSync('db/index.ts','utf8');
  for(const s of new Function('return '+src.match(/const statements=(\[[\s\S]*?\]);/)[1])())sql.exec(s);
  globalThis.__capiDb = drizzle(async (query, params, method) => {
    const st=sql.prepare(query);
    if(method==='run'){st.run(...params);return {rows:[]};}
    st.setReturnArrays(true);return {rows:method==='get'?st.get(...params):st.all(...params)};
  });
  sql.prepare('INSERT INTO projects(id,workspace_id,name,domain,public_key,pixel_id,meta_token_cipher,meta_token_iv,meta_test_code,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run('p',ws,'Test project','https://shop.example','public-key','12345678','cipher','iv','TEST123','2026-10-09');
  sql.prepare('INSERT INTO api_credentials(id,workspace_id,project_id,name,provider,token_hash,active,created_at) VALUES(?,?,?,?,?,?,?,?)').run('cred',ws,'p','gateway','fortpay',sha('test-key'),1,'2026-10-09');
  calls=[];response=()=>Response.json({events_received:1,fbtrace_id:'trace'});
  globalThis.__decryptFails=false;globalThis.__notifications=0;
  originalSecret=process.env.UTMIFY_WEBHOOK_SECRET;delete process.env.UTMIFY_WEBHOOK_SECRET;
  globalThis.fetch=async(url,init)=>{calls.push({url,headers:init.headers,body:JSON.parse(init.body)});return response();};
});
afterEach(()=>{globalThis.fetch=realFetch;sql.close();if(originalSecret===undefined)delete process.env.UTMIFY_WEBHOOK_SECRET;else process.env.UTMIFY_WEBHOOK_SECRET=originalSecret;});
const paid=()=>({id:'order-1',status:'approved',amount:1490,currency:'BRL',paid_at:new Date(Date.now()-90000).toISOString(),customer:{email:'buyer@example.com',phone:'11988887777'}});
const webhook=(body,token='test-key')=>new Request('https://app.example/api/webhooks/gateway?token='+token,{method:'POST',headers:{'content-type':'application/json','user-agent':'gateway-server'},body:JSON.stringify(body)});
const diag=(method='GET',user='owner',body,origin='https://app.example')=>new Request('https://app.example/api/meta/capi-deliveries',{method,headers:{...(user?{'x-test-user':user}:{}),origin,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
const row=()=>sql.prepare('SELECT * FROM capi_outbox').get();

test('approved payment is acknowledged, stored as sent, and duplicate webhook cannot duplicate purchase',async()=>{
 const body=paid();assert.equal((await gateway.POST(webhook(body))).status,200);
 assert.equal(calls.length,1);assert.equal(row().status,'sent');
 const event=calls[0].body.data[0];assert.equal(event.event_name,'Purchase');assert.equal(event.custom_data.value,14.9);
 assert.equal(event.event_time,Math.floor(Date.parse(body.paid_at)/1000));assert.equal(event.event_source_url,'https://shop.example/');
 assert.equal(event.user_data.client_user_agent,undefined);assert.match(event.user_data.em,/^[a-f0-9]{64}$/);
 assert.ok(!calls[0].url.includes('test-token'));assert.equal(calls[0].body.test_event_code,undefined);
 const second=await (await gateway.POST(webhook(body))).json();assert.equal(second.capi,'sent');assert.equal(second.dedup,true);
 assert.equal(calls.length,1);assert.equal(sql.prepare('SELECT count(*) n FROM orders').get().n,1);
 assert.equal(sql.prepare("SELECT count(*) n FROM events WHERE event_name='Purchase'").get().n,1);assert.equal(globalThis.__notifications,1);
});

test('Meta error persists its code and an authenticated retry keeps the original event id and time',async()=>{
 response=()=>Response.json({error:{code:190,message:'sensitive buyer data'}},{status:400});
 await gateway.POST(webhook(paid()));assert.equal(row().status,'pending');assert.match(row().last_error,/code 190/);assert.ok(!row().last_error.includes('sensitive'));
 const first=calls[0].body.data[0];response=()=>Response.json({events_received:1});
 const reply=await diagnostics.POST(diag('POST','owner',{id:row().id}));assert.equal(reply.status,200);assert.equal(row().status,'sent');
 assert.equal(calls.length,2);assert.equal(calls[1].body.data[0].event_id,first.event_id);assert.equal(calls[1].body.data[0].event_time,first.event_time);
});

test('HTTP 200 without events_received is not success',async()=>{
 for(const value of [{events_received:0},{}, {error:{code:100}}]){
  response=()=>Response.json(value);assert.equal((await dispatchCapi('123','token',{data:[{}]})).ok,false);
 }
});

test('decryption failure and missing token do not silently discard a saved sale',async()=>{
 globalThis.__decryptFails=true;await gateway.POST(webhook(paid()));assert.equal(calls.length,0);assert.equal(row().status,'pending');
 assert.match(row().last_error,/token CAPI/);globalThis.__decryptFails=false;
 sql.prepare('UPDATE projects SET meta_token_cipher=NULL').run();
 await diagnostics.POST(diag('POST','owner',{id:row().id}));assert.equal(calls.length,0);assert.equal(row().status,'pending');
 sql.prepare("UPDATE projects SET meta_token_cipher='cipher'").run();
 await diagnostics.POST(diag('POST','owner',{id:row().id}));assert.equal(row().status,'sent');
});

test('first purchase without configured pixel is queued and sent after configuration',async()=>{
 sql.prepare('UPDATE projects SET pixel_id=NULL,meta_token_cipher=NULL').run();await gateway.POST(webhook(paid()));
 assert.equal(row().status,'pending');assert.equal(calls.length,0);
 sql.prepare("UPDATE projects SET pixel_id='12345678',meta_token_cipher='cipher'").run();
 await diagnostics.POST(diag('POST','owner',{id:row().id}));assert.equal(row().status,'sent');
});

test('pixel changes do not redirect an existing purchase to a different advertiser',async()=>{
 response=()=>Response.json({}, {status:503});await gateway.POST(webhook(paid()));
 sql.prepare("UPDATE projects SET pixel_id='99999999'").run();
 await diagnostics.POST(diag('POST','owner',{id:row().id}));assert.equal(calls.length,1);assert.match(row().last_error,/pixel alterado/);
});

test('Utmify confirmed purchases are production events even with saved test code',async()=>{
 const body={orderId:'u1',status:'paid',commission:{totalPriceInCents:2490},customer:{email:'buyer@example.com'}};
 await utmify.POST(webhook(body));assert.equal(calls.length,1);assert.equal(calls[0].body.test_event_code,undefined);assert.equal(calls[0].body.data[0].custom_data.value,24.9);
 await utmify.POST(webhook(body));assert.equal(calls.length,1);
});

test('pending, cancelled and refunded orders never send Purchase',async()=>{
 for(const status of ['pending','cancelled','refunded']) await gateway.POST(webhook({...paid(),id:status,status}));
 assert.equal(calls.length,0);assert.equal(row(),undefined);
 await gateway.POST(webhook({...paid(),id:'pending',status:'approved'}));assert.equal(calls.length,1);
});

test('a replay repairs a sale saved before enqueue without changing its timestamp',async()=>{
 const body=paid();await gateway.POST(webhook(body));const first=calls[0].body.data[0];
 sql.prepare('DELETE FROM capi_outbox').run();await gateway.POST(webhook(body));
 assert.equal(row().status,'sent');assert.equal(calls[1].body.data[0].event_time,first.event_time);assert.equal(calls[1].body.data[0].event_id,first.event_id);
});

test('concurrent drains claim a pending delivery only once',async()=>{
 response=()=>Response.json({}, {status:500});await gateway.POST(webhook(paid()));
 sql.prepare('UPDATE capi_outbox SET next_attempt_at=0').run();calls=[];response=()=>Response.json({events_received:1});
 await Promise.all([ingest.drainCapiOutbox(globalThis.__capiDb),ingest.drainCapiOutbox(globalThis.__capiDb)]);
 assert.equal(calls.length,1);assert.equal(row().status,'sent');
});

test('diagnostics and retry require own workspace and same origin; no tokens or buyer payload returned',async()=>{
 response=()=>Response.json({}, {status:500});await gateway.POST(webhook(paid()));const id=row().id;
 assert.equal((await diagnostics.GET(diag('GET',null))).status,401);
 assert.equal((await diagnostics.POST(diag('POST','other',{id}))).status,404);
 assert.equal((await diagnostics.POST(diag('POST','owner',{id},'https://evil.example'))).status,403);
 assert.deepEqual((await (await diagnostics.GET(diag('GET','other'))).json()).deliveries,[]);
 const text=await (await diagnostics.GET(diag())).text();assert.ok(!text.includes('buyer@example'));assert.ok(!text.includes('cipher'));assert.ok(!text.includes('test-token'));
});

test('invalid webhook token is rejected before storing or dispatching',async()=>{
 assert.equal((await gateway.POST(webhook(paid(),'invalid'))).status,401);assert.equal(calls.length,0);assert.equal(row(),undefined);
});

test('pending and approved with the same supplied event_id do not swallow Purchase',async()=>{
 const body={...paid(),event_id:'checkout-event'};
 await gateway.POST(webhook({...body,status:'pending'}));await gateway.POST(webhook(body));
 assert.equal(calls.length,1);assert.equal(calls[0].body.data[0].event_id,'checkout-event');
 assert.equal(sql.prepare("SELECT count(*) n FROM events WHERE event_name='Purchase'").get().n,1);
});

test('visitor lookup can recover the real browser from fbp without tb_vid',async()=>{
 const fbp='fb.1.1791540000000.12345';
 sql.prepare('INSERT INTO events(id,project_id,event_id,event_name,source,occurred_at,fbp,payload) VALUES(?,?,?,?,?,?,?,?)').run('visit','p','visit','PageView','browser',Math.floor(Date.now()/1000)-100,fbp,JSON.stringify({_ip:'192.0.2.4',_ua:'real-browser',url:'https://shop.example/offer'}));
 await gateway.POST(webhook({...paid(),trackingParameters:{fbp}}));
 assert.equal(calls[0].body.data[0].user_data.client_user_agent,'real-browser');assert.equal(calls[0].body.data[0].event_source_url,'https://shop.example/offer');
});

test('legacy outbox is reused, not duplicated during a redelivery',async()=>{
 response=()=>Response.json({}, {status:500});const body=paid();await gateway.POST(webhook(body));
 sql.prepare("UPDATE capi_outbox SET id='legacy-random-id'").run();await gateway.POST(webhook(body));
 assert.equal(sql.prepare('SELECT count(*) n FROM capi_outbox').get().n,1);assert.equal(row().id,'legacy-random-id');
});

test('old recorded approvals without a receipt are not automatically replayed',async()=>{
 const body=paid();await gateway.POST(webhook(body));sql.prepare('DELETE FROM capi_outbox').run();
 sql.prepare("UPDATE events SET occurred_at=? WHERE event_name='Purchase'").run(Math.floor(Date.now()/1000)-3*86400);
 await gateway.POST(webhook(body));assert.equal(calls.length,1);assert.equal(row(),undefined);
});
