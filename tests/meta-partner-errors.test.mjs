import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {and,eq,ne} from 'drizzle-orm';
function load(path,deps,names){const source=readFileSync(new URL(path,import.meta.url),'utf8');const js=ts.transpile(source,{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext});return new Function(...Object.keys(deps),js.replace(/^import .*;\s*$/gm,'').replace(/^export /gm,'')+`\nreturn {${names.join(',')}};`)(...Object.values(deps))}
const {MetaApiError,metaJson}=load('../lib/meta.ts',{},['MetaApiError','metaJson']);
const {canAssignPartnerAccount,partnerFailure}=load('../lib/meta-partner-errors.ts',{MetaApiError},['canAssignPartnerAccount','partnerFailure']);
const accountId='1059049790511894';
function fixture({reads=[{account_id:accountId,name:'Minha conta',business:{id:'other-business'}}],assignError,taken=false}={}){
 let readCount=0,assignCount=0;const writes=[];
 const chain={from(){return this},where(){return this},async limit(){return taken?[{id:'other-user'}]:[]}};
 const db={select:()=>Object.create(chain),insert:()=>({values:v=>({onConflictDoUpdate:async()=>writes.push(v)})}),update:()=>({set:()=>({where:async()=>{}})})};
 const {POST}=load('../app/api/meta/partner/route.ts',{and,eq,ne,canAssignPartnerAccount,partnerFailure,ensureDb:async()=>{},getDb:()=>db,metaAccounts:{id:'id',adAccountId:'ad',metaUserId:'login',userId:'user'},PARTNER_LOGIN_ID:'partner',partnerConfig:()=>({configured:true,token:'secret-system-token',businessId:'1063282806667990'}),hasConflictingOrigin:()=>false,requestUserId:async()=> 'customer',hasActivePlan:async()=>true,readPartnerAccount:async()=>{const result=reads[Math.min(readCount++,reads.length-1)];if(result instanceof Error)throw result;return result},assignToSystemUser:async()=>{assignCount++;if(assignError)throw assignError},encryptSecret:async()=>({cipher:'cipher',iv:'iv'}),sha256:async()=> 'workspace',crypto:globalThis.crypto},['POST']);
 const request=(body={adAccountId:accountId,accountName:'Minha conta'})=>POST(new Request('https://www.ghostscale.com.br/api/meta/partner',{method:'POST',body:JSON.stringify(body)}));
 return {request,writes,counts:()=>({reads:readCount,assignments:assignCount})};
}
test('expired system token is not reported as missing sharing and never triggers an assignment',async()=>{
 const f=fixture({reads:[new MetaApiError('provider may echo private data',400,190,463)]}),r=await f.request();assert.equal(r.status,503);const text=await r.text(),body=JSON.parse(text);assert.equal(body.code,'PARTNER_TOKEN_INVALID');assert.equal(body.metaCode,190);assert.equal(body.metaSubcode,463);assert.equal(body.stage,'read');assert.deepEqual(f.counts(),{reads:1,assignments:0});assert.equal(f.writes.length,0);assert.ok(!text.includes('secret-system-token'));assert.ok(!text.includes('private data'));
});
test('rate limits and network failures cannot trigger account assignment or a false sharing claim',async()=>{
 for(const error of [new MetaApiError('limited',429,4),new MetaApiError('outage',503,2,undefined,true),new TypeError('network')]){const f=fixture({reads:[error]}),r=await f.request(),body=await r.json();assert.ok([429,503].includes(r.status));assert.ok(['META_RATE_LIMIT','META_TEMPORARY_UNAVAILABLE'].includes(body.code));assert.deepEqual(f.counts(),{reads:1,assignments:0});assert.equal(f.writes.length,0)}
});
test('a real account access failure uses the existing assignment flow and rechecks the exact account ID',async()=>{
 const f=fixture({reads:[new MetaApiError('permission',400,100,33),{account_id:accountId,name:'Minha conta',business:{id:'other'}}]});const r=await f.request();assert.equal(r.status,200);assert.deepEqual(f.counts(),{reads:2,assignments:1});assert.equal(f.writes.length,1);assert.equal(f.writes[0].adAccountId,accountId);
});
test('assignment permission denial identifies the system-user step without claiming the account was not shared',async()=>{
 const f=fixture({reads:[new MetaApiError('permission',403,200)],assignError:new MetaApiError('forbidden',403,200)}),r=await f.request(),body=await r.json();assert.equal(r.status,403);assert.equal(body.code,'PARTNER_ASSIGNMENT_REQUIRED');assert.equal(body.stage,'assignment');assert.match(body.error,/usuário do sistema/);assert.equal(f.writes.length,0);
});
test('an expired token during assignment remains a server-token error',async()=>{
 const f=fixture({reads:[new MetaApiError('permission',403,200)],assignError:new MetaApiError('token',400,190)});const body=await (await f.request()).json();assert.equal(body.code,'PARTNER_TOKEN_INVALID');assert.equal(body.stage,'assignment');assert.equal(f.writes.length,0);
});
test('wrong name, foreign account and invalid response cannot save or reassign an account',async()=>{
 const mismatch=fixture(),r=await mismatch.request({adAccountId:accountId,accountName:'Nome errado'});assert.equal(r.status,403);assert.equal((await r.json()).code,'ACCOUNT_NAME_MISMATCH');assert.equal(mismatch.writes.length,0);assert.equal(mismatch.counts().assignments,0);
 const foreign=fixture({taken:true});assert.equal((await foreign.request()).status,409);assert.deepEqual(foreign.counts(),{reads:0,assignments:0});
 const invalid=fixture({reads:[{account_id:'wrong-account',name:'Minha conta'}]});assert.equal((await invalid.request()).status,503);assert.equal(invalid.writes.length,0);
});
test('malformed or numeric IDs and missing names fail before the Meta lookup',async()=>{
 for(const body of [{adAccountId:'abc1059049790511894',accountName:'Minha conta'},{adAccountId:Number(accountId),accountName:'Minha conta'},{adAccountId:accountId,accountName:''},null]){const f=fixture();assert.equal((await f.request(body)).status,400);assert.deepEqual(f.counts(),{reads:0,assignments:0})}
 const f=fixture();assert.equal((await f.request({adAccountId:' act_'+accountId+' ',accountName:'Minha conta'})).status,200);
});
test('Meta client preserves numeric error details and handles invalid provider bodies',async()=>{
 const original=globalThis.fetch;
 try{globalThis.fetch=async()=>Response.json({error:{message:'expired',code:190,error_subcode:463,is_transient:false}},{status:400});await assert.rejects(metaJson('https://graph.facebook.com/test'),e=>e instanceof MetaApiError&&e.code===190&&e.subcode===463&&e.status===400);
 globalThis.fetch=async()=>new Response('<html>unavailable</html>',{status:502});await assert.rejects(metaJson('https://graph.facebook.com/test'),e=>e instanceof MetaApiError&&e.transient===true&&e.status===502);
 }finally{globalThis.fetch=original}
});
