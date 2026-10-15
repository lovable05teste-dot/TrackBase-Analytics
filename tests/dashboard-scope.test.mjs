import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import {applyCosts,ZERO_COSTS} from '../lib/costs.ts';
import {loadDashboardAds} from '../lib/dashboard-ads.ts';

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
export async function encryptSecret(v){return {cipher:'encrypted-'+v,iv:'iv'};}
export async function hasActivePlan(){return true;}
export function planRequiredResponse(){return Response.json({error:'plan'},{status:402});}
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

const dashboards=await load('app/api/dashboards/route.ts');
const revenue=await load('app/api/dashboard/route.ts');
const meta=await load('app/api/meta/campaigns/route.ts');
const tiktok=await load('app/api/tiktok/campaigns/route.ts');
const options=await load('app/api/dashboards/options/route.ts');
let sql,calls;
const originalFetch=globalThis.fetch;
const req=(path,method='GET',body,user='owner')=>new Request('https://app.example/api/'+path,{method,headers:{'x-test-user':user,origin:'https://app.example','content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
const config=(project,account,cost=0)=>({period:'today',source:'',product:'',start:'',end:'',metrics:['net','spend','profit'],autoRefresh:0,scope:{projectIds:[project],metaAccountIds:account?[account]:[],tiktokAccountIds:[],metaCampaignIds:[],tiktokCampaignIds:[]},costs:{...ZERO_COSTS,productCostPct:cost}});
async function save(c,name='Dashboard'){const r=await dashboards.POST(req('dashboards','POST',{name,config:c}));assert.equal(r.status,201,await r.clone().text());return (await r.json()).dashboard;}
beforeEach(()=>{
 sql=new DatabaseSync(':memory:');const src=readFileSync('db/index.ts','utf8');for(const s of new Function('return '+src.match(/const statements=(\[[\s\S]*?\]);/)[1])())sql.exec(s);
 globalThis.__capiDb=drizzle(async(query,params,method)=>{const st=sql.prepare(query);if(method==='run'){st.run(...params);return {rows:[]}}st.setReturnArrays(true);return {rows:method==='get'?st.get(...params):st.all(...params)}});
 for(const [id,value] of [['p',1000],['q',2000]]){sql.prepare('INSERT INTO projects(id,workspace_id,name,created_at) VALUES(?,?,?,?)').run(id,ws,id,'2026-10-15');sql.prepare('INSERT INTO events(id,project_id,event_id,event_name,source,occurred_at,value,currency,utm_source,utm_campaign) VALUES(?,?,?,?,?,?,?,?,?,?)').run('sale-'+id,id,'sale-'+id,'Purchase','webhook',Math.floor(Date.now()/1000)-1,value,'BRL','facebook',id==='p'?'111111':'222222')}
 for(const id of ['a','b'])sql.prepare('INSERT INTO meta_accounts(id,workspace_id,user_id,ad_account_id,account_name,currency,access_token_cipher,access_token_iv,connected_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,ws,'owner',id==='a'?'101':'202','Account '+id,'BRL','cipher','iv',1,1);
 globalThis.__decryptFails=false;calls=[];
 globalThis.fetch=async url=>{calls.push(String(url));const u=new URL(url),a=u.pathname.includes('act_101'),cid=a?'111111':'222222',spend=a?'100':'400';if(u.pathname.endsWith('/campaigns'))return Response.json({data:[{id:cid,name:cid,status:'ACTIVE',insights:{data:[{spend,clicks:'10'}]}}]});if(u.pathname.endsWith('/insights'))return Response.json({data:[{campaign_id:cid,campaign_name:cid,date_start:new Date(Date.now()-3*3600000).toISOString().slice(0,10),spend,clicks:'10'}]});throw Error('unexpected request '+u.pathname)};
});
afterEach(()=>{globalThis.fetch=originalFetch;sql.close()});
test('two dashboards independently select revenue, account spend and costs, including comparison',async()=>{
 const a=await save(config('p','a',10),'A'),b=await save(config('q','b',20),'B');
 for(const [d,expectedRevenue,expectedSpend,expectedProfit] of [[a,1000,100,800],[b,2000,400,1200]]){
  calls=[];const r=await revenue.GET(req('dashboard?period=today&dashboardId='+d.id));assert.equal(r.status,200);const data=await r.json();assert.equal(data.metrics.net,expectedRevenue);
  const mr=await meta.GET(req('meta/campaigns?period=today&dashboardId='+d.id));assert.equal(mr.status,200);const ad=await mr.json();assert.deepEqual(ad.failures,[]);assert.equal(ad.accounts,1);const spend=ad.campaigns.reduce((s,i)=>s+i.spend,0);assert.equal(spend,expectedSpend);assert.equal(applyCosts({revenue:data.metrics.net,sales:1,spend,days:1},d.config.costs).profit,expectedProfit);assert.ok(calls.every(url=>url.includes(d===a?'act_101':'act_202')));
  const prior=await (await revenue.GET(req('dashboard?period=today&compare=1&dashboardId='+d.id))).json();assert.equal(prior.metrics.net,0);
 }
});
test('cost update is dashboard-only and cannot modify another tenant',async()=>{
 const a=await save(config('p','a')),b=await save(config('q','b'));
 assert.equal((await dashboards.PATCH(req('dashboards','PATCH',{id:a.id,costs:{...ZERO_COSTS,taxPct:5}},'other'))).status,404);
 assert.equal((await dashboards.PATCH(req('dashboards','PATCH',{id:a.id,costs:{...ZERO_COSTS,taxPct:5}}))).status,200);
 const list=(await (await dashboards.GET(req('dashboards'))).json()).dashboards;assert.equal(list.find(d=>d.id===a.id).config.costs.taxPct,5);assert.equal(list.find(d=>d.id===b.id).config.costs.taxPct,0);
 assert.equal((await dashboards.POST(req('dashboards','POST',{id:a.id,name:'Renamed',config:{...a.config,costs:{...ZERO_COSTS,taxPct:6}}}))).status,200);
 assert.equal(sql.prepare('SELECT count(*) n FROM saved_dashboards').get().n,2);
});
test('foreign, deleted and legacy bindings fail closed rather than showing global totals',async()=>{
 const a=await save(config('p','a'));
 for(const api of [revenue,meta,tiktok])assert.equal((await api.GET(req('dashboard?dashboardId='+a.id,'GET',null,'other'))).status,409);
 sql.prepare('DELETE FROM meta_accounts WHERE id=?').run('a');for(const api of [revenue,meta,tiktok])assert.equal((await api.GET(req('dashboard?dashboardId='+a.id))).status,409);
 const legacy=config('q','b');delete legacy.scope;sql.prepare('UPDATE saved_dashboards SET config=? WHERE id=?').run(JSON.stringify(legacy),a.id);assert.equal((await revenue.GET(req('dashboard?dashboardId='+a.id))).status,409);
 assert.equal((await dashboards.POST(req('dashboards','POST',{name:'No scope',config:legacy}))).status,400);
 assert.equal((await dashboards.POST(req('dashboards','POST',{name:'Invalid account',config:config('q','foreign')}))).status,409);
 const otherOptions=await (await options.GET(req('dashboards/options','GET',null,'other'))).json();assert.deepEqual(otherOptions,{projects:[],metaAccounts:[],tiktokAccounts:[]});
 const optionText=await (await options.GET(req('dashboards/options'))).text();assert.ok(!optionText.includes('cipher'));assert.ok(!optionText.includes('token'));
});
test('campaign filter excludes another campaign in the same account and its sales',async()=>{
 const c=config('p','a');c.scope.metaCampaignIds=['111111'];const d=await save(c);
 sql.prepare('INSERT INTO events(id,project_id,event_id,event_name,source,occurred_at,value,currency,utm_source,utm_campaign) VALUES(?,?,?,?,?,?,?,?,?,?)').run('other','p','other','Purchase','webhook',Math.floor(Date.now()/1000)-1,500,'BRL','facebook','Other | 333333');
 const before=globalThis.fetch;globalThis.fetch=async url=>{const r=await before(url),body=await r.json();if(String(url).includes('/campaigns?'))body.data.push({id:'333333',name:'Other',insights:{data:[{spend:'999'}]}});else body.data.push({campaign_id:'333333',date_start:'2026-10-15',spend:'999'});return Response.json(body)};
 const sales=await (await revenue.GET(req('dashboard?period=today&dashboardId='+d.id))).json(),ads=await (await meta.GET(req('meta/campaigns?period=today&dashboardId='+d.id))).json();assert.equal(sales.metrics.net,1000);assert.equal(ads.campaigns.length,1);assert.equal(ads.campaigns[0].spend,100);assert.equal(ads.daily.length,1);
});
test('an intentionally empty ad selection is zero and never falls back to all accounts',async()=>{
 const d=await save(config('p',null));for(const api of [meta,tiktok]){const r=await api.GET(req('campaigns?period=today&dashboardId='+d.id));assert.equal(r.status,200);assert.equal((await r.json()).accounts,0)}assert.equal(calls.length,0);
});
test('Meta insight-only archived campaigns remain included in account expense',async()=>{
 const d=await save(config('p','a')),before=globalThis.fetch;globalThis.fetch=async url=>{const r=await before(url),body=await r.json();if(String(url).includes('/insights?'))body.data.push({campaign_id:'333333',campaign_name:'Archived',date_start:'2026-10-15',spend:'50'});return Response.json(body)};
 const ads=await (await meta.GET(req('meta/campaigns?period=today&dashboardId='+d.id))).json();assert.equal(ads.campaigns.reduce((s,i)=>s+i.spend,0),150);
});
test('ad loader forwards scope and dates to both providers and flags partial or failed spend',async()=>{
 const q=new URLSearchParams({dashboardId:'scope-a',period:'custom',start:'2026-10-01',end:'2026-10-07',compare:'1'}),seen=[];
 globalThis.fetch=async url=>{seen.push(String(url));return Response.json(String(url).includes('/meta/')?{campaigns:[{spend:100,clicks:10}],daily:[],accounts:1,failures:[]}:{items:[{spend:50,clicks:5}],accounts:1,failures:[]})};
 const ok=await loadDashboardAds(q,new AbortController().signal);assert.equal(ok.meta.campaigns.reduce((s,i)=>s+i.spend,0),150);assert.equal(ok.meta.unavailable,false);assert.equal(ok.meta.dailyComplete,false);for(const url of seen)for(const [key,value] of q)assert.equal(new URL(url,'https://app.example').searchParams.get(key),value);
 globalThis.fetch=async url=>Response.json(String(url).includes('/meta/')?{campaigns:[],accounts:1,failures:[{account:'A',error:'expired'}]}:{items:[],accounts:0,failures:[]});const failed=await loadDashboardAds(q,new AbortController().signal);assert.equal(failed.meta.unavailable,true);assert.match(failed.warning,/expired/);
 globalThis.fetch=async()=>Response.json({error:'Unavailable'},{status:503});assert.equal((await loadDashboardAds(q,new AbortController().signal)).meta.unavailable,true);
});
test('TikTok uses dashboard accounts, campaign IDs and the requested comparison dates',async()=>{
 for(const id of ['tt-a','tt-b'])sql.prepare('INSERT INTO tiktok_accounts(id,workspace_id,user_id,advertiser_id,advertiser_name,currency,access_token_cipher,access_token_iv,connected_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,ws,'owner',id,id,'BRL','cipher','iv',1,1);
 const c=config('p',null);c.period='custom';c.start='2026-10-10';c.end='2026-10-12';c.scope.tiktokAccountIds=['tt-a'];c.scope.tiktokCampaignIds=['777777'];const d=await save(c);const reports=[];
 globalThis.fetch=async url=>{const u=new URL(url);assert.equal(u.searchParams.get('advertiser_id'),'tt-a');if(u.pathname.endsWith('/report/integrated/get/')){reports.push(u);return Response.json({code:0,data:{list:[{dimensions:{campaign_id:'777777'},metrics:{spend:'75',clicks:'5'}},{dimensions:{campaign_id:'888888'},metrics:{spend:'900'}}]}})}return Response.json({code:0,data:{list:[{campaign_id:'777777',campaign_name:'Offer',operation_status:'ENABLE'}]}})};
 const base=`tiktok/campaigns?dashboardId=${d.id}&period=custom&start=2026-10-10&end=2026-10-12`;
 const r=await tiktok.GET(req(base));assert.equal(r.status,200);const body=await r.json();assert.equal(body.accounts,1);assert.equal(body.totals.spend,75);assert.equal(body.items.length,1);
 assert.equal(reports[0].searchParams.get('start_date'),'2026-10-10');assert.equal(reports[0].searchParams.get('end_date'),'2026-10-12');
 await tiktok.GET(req(base+'&compare=1'));assert.equal(reports[1].searchParams.get('start_date'),'2026-10-07');assert.equal(reports[1].searchParams.get('end_date'),'2026-10-09');
 const max=await tiktok.GET(req(`tiktok/campaigns?dashboardId=${d.id}&period=maximum`));assert.equal(max.status,500);assert.match((await max.json()).error,/período com datas/);
 globalThis.fetch=async()=>Response.json({code:401,message:'expired'},{status:401});const failed=await (await tiktok.GET(req(base))).json();assert.equal(failed.failures.length,1);
});
