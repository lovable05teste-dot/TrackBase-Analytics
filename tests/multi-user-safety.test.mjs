import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { and, eq, lt, sql } from 'drizzle-orm';

// Execute the actual production functions with injected database/network boundaries.
function load(relative, dependencies, exports) {
  const source = readFileSync(new URL(relative, import.meta.url), 'utf8');
  const js = ts.transpile(source, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext });
  const body = js.replace(/^import .*;\s*$/gm, '').replace(/^export /gm, '');
  return new Function(...Object.keys(dependencies), body + `\nreturn {${exports.join(',')}};`)(...Object.values(dependencies));
}

test('atomic usage reservation honors the limit under concurrent requests and isolates workspaces', async () => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('CREATE TABLE usage_counters(id TEXT PRIMARY KEY, workspace_id TEXT, metric TEXT, period_start INTEGER, period_end INTEGER, count INTEGER, updated_at INTEGER, UNIQUE(workspace_id, metric, period_start))');
  const usageCounters = sqliteTable('usage_counters', { id:text('id').primaryKey(),workspaceId:text('workspace_id'),metric:text('metric'),periodStart:integer('period_start'),periodEnd:integer('period_end'),count:integer('count'),updatedAt:integer('updated_at') });
  const db = drizzle(async (query, params, method) => {
    const stmt = sqlite.prepare(query);
    if (method === 'run') { stmt.run(...params); return { rows: [] }; }
    stmt.setReturnArrays(true);
    return { rows: stmt.all(...params) };
  });
  const {reserveUsage} = load('../lib/permissions.ts', {cache:x=>x,ensureDb:async()=>{},getDb:()=>db,usageCounters,and,eq,lt,sql}, ['reserveUsage']);
  try {
    const results = await Promise.all(Array.from({length:25},()=>reserveUsage('alice','sales',10,20,3)));
    assert.equal(results.filter(Boolean).length,3);
    assert.equal(sqlite.prepare('SELECT count FROM usage_counters WHERE workspace_id=?').get('alice').count,3);
    assert.equal(await reserveUsage('bob','sales',10,20,3),true);
    assert.equal(await reserveUsage('alice','sales',20,30,3),true);
    assert.equal(await reserveUsage('zero','sales',10,20,0),false);
    assert.equal(await reserveUsage('invalid','sales',10,20,NaN),false);
  } finally { sqlite.close(); }
});

test('knowing partner account ID and name does not authorize an unapproved customer', async () => {
  let remoteCalls=0;
  const chain={from(){return this},where(){return this},async limit(){return []}};
  const {POST}=load('../app/api/meta/partner/route.ts', {
    and,eq,ne:()=>{},ensureDb:async()=>{},getDb:()=>({select:()=>Object.create(chain)}),
    metaAccounts:{adAccountId:'ad',metaUserId:'login',userId:'user',id:'id'},metaPartnerGrants:{adAccountId:'ad',userId:'user'},
    PARTNER_LOGIN_ID:'partner',partnerConfig:()=>({configured:true,token:'server-secret',businessId:'12345'}),
    hasConflictingOrigin:()=>false,requestUserId:async()=> 'customer',hasActivePlan:async()=>true,isAdminUserId:async()=>false,
    readPartnerAccount:async()=>{remoteCalls++;throw Error('must not query shared credentials')},
  },['POST']);
  const response=await POST(new Request('https://www.ghostscale.com.br/api/meta/partner',{method:'POST',body:JSON.stringify({adAccountId:'123456789',accountName:'Known name'})}));
  assert.equal(response.status,403);
  assert.equal((await response.json()).code,'PARTNER_APPROVAL_REQUIRED');
  assert.equal(remoteCalls,0);
});

test('Meta changes reject a conflicting origin before accessing any account', async () => {
  for(const [file,methods] of [['accounts',['POST','DELETE']],['actions',['POST']],['connect',['POST','DELETE']],['manual-token',['POST']],['pixel/create',['POST']]]) {
    const routes=load(`../app/api/meta/${file}/route.ts`,{hasConflictingOrigin:()=>true},methods);
    for(const method of methods) assert.equal((await routes[method](new Request('https://www.ghostscale.com.br/api/meta/'+file,{method}))).status,403,`${file} ${method}`);
  }
});
