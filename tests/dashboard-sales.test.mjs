import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../lib/dashboard-sales.ts',import.meta.url),'utf8');
const js=ts.transpile(source,{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}).replace(/^export /gm,'');
const {reconcileSales,sumMoney}=new Function(js+';return {reconcileSales,sumMoney}')();
const order=(id,status,extra={})=>({id,projectId:'p1',provider:'gateway',externalId:id,eventId:status==='approved'?`purchase_gateway_${id}`:`gw_gateway_${id}_${status}`,status,value:19.9,currency:'BRL',createdAt:120,utmSource:'facebook',utmCampaign:'c',...extra});
const event=(id,name,extra={})=>({id:`${id}-${name}`,projectId:'p1',eventId:name==='Purchase'?`purchase_gateway_${id}`:`gw_gateway_${id}_${name==='PaymentPending'?'pending':'cancelled'}`,eventName:name,occurredAt:140,value:19.9,currency:'BRL',source:'gateway',visitorId:null,utmSource:'facebook',utmCampaign:'c',product:'Kit',payment:'pix',country:'BR',...extra});
const run=(orders,events,source=null,product=null)=>reconcileSales(orders,events,{start:100,end:200},e=>e.source==='test',source,product);
test('current statuses remove historical pending after approval and cancellation',()=>{
 const result=run([order('a','approved'),order('b','cancelled'),order('c','pending')],[event('a','PaymentPending'),event('a','Purchase'),event('b','PaymentPending'),event('b','PaymentCancelled'),event('c','PaymentPending')]);
 assert.equal(result.initiated.length,3);assert.equal(result.pending.length,1);assert.equal(sumMoney(result.pending),19.9);assert.equal(result.financial.filter(e=>e.eventName==='Purchase').length,1);assert.ok(Math.abs(result.approvalRate-100/3)<1e-10);
});
test('IDs shared across projects do not collapse sales; delivery duplicates do',()=>{
 const result=run([order('a','approved'),order('a','approved',{id:'a2',projectId:'p2'})],[event('a','Purchase'),event('a','Purchase',{id:'retry'}),event('a','Purchase',{projectId:'p2'})]);
 assert.equal(result.financial.length,2);assert.equal(result.initiated.length,2);
});
test('source and product filters use the same order cohort and preserve direct sales',()=>{
 const orders=[order('a','pending'),order('b','pending',{utmSource:null})],events=[event('a','PaymentPending'),event('b','PaymentPending',{utmSource:null,product:'Other'})];
 assert.equal(run(orders,events,'facebook','Kit').pending.length,1);assert.equal(run(orders,events,'Direto','Other').initiated.length,1);assert.equal(run(orders,events).pending.length,2);
});
test('explicit tests exclude their whole order; prior-period approval does not inflate initiation',()=>{
 const result=run([order('a','pending'),order('old','approved',{createdAt:50})],[event('a','PaymentPending',{source:'test'}),event('old','Purchase')]);
 assert.equal(result.pending.length,0);assert.equal(result.initiated.length,0);assert.equal(result.financial.length,1);assert.equal(result.approvalRate,null);
});
test('money sums cents without floating point residue',()=>{assert.equal(sumMoney([{value:0.1},{value:0.2}]),0.3)});

test('custom event IDs changing between statuses still map by transaction ID',()=>{
 const result=run([order('a','approved',{eventId:'custom-paid'})],[event('a','PaymentPending',{eventId:'custom-created',payload:JSON.stringify({transaction:{id:'a'}})}),event('a','Purchase',{eventId:'custom-paid',payload:JSON.stringify({transaction:{id:'a'}})}),event('a','Purchase',{eventId:'custom-retry',payload:JSON.stringify({transaction:{id:'a'}})})]);
 assert.equal(result.pending.length,0);assert.equal(result.financial.length,1);
});
