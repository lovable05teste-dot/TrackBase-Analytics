import { and,eq,gte,inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { actionHistory,automationRules,events,metaAccounts,metaLinked,projects } from "@/db/schema";
import { metaJson } from "./meta";
import { accountToken,graph,norm,num } from "./meta-lab";
import { pushToWorkspace } from "./push";

export type RuleRow=typeof automationRules.$inferSelect;
type LevelTotals={id:string;name:string;spend:number;impressions:number;clicks:number;reach:number};
const IDF={campaign:"campaign_id",adset:"adset_id",ad:"ad_id"} as const;
const NMF={campaign:"campaign_name",adset:"adset_name",ad:"ad_name"} as const;

async function levelTotals(token:string,adAccountId:string,level:"campaign"|"adset"|"ad",since:string,until:string):Promise<LevelTotals[]>{
 const fields=`${IDF[level]},${NMF[level]},spend,impressions,clicks,reach`;
 const body=await metaJson<{data:Array<Record<string,unknown>>}>(graph(`act_${adAccountId}/insights`,{level,fields,limit:"500",time_range:JSON.stringify({since,until})},token));
 return (body.data||[]).map(r=>({id:String(r[IDF[level]]||""),name:String(r[NMF[level]]||""),spend:num(r.spend),impressions:num(r.impressions),clicks:num(r.clicks),reach:num(r.reach)}));
}
function isoDaysAgo(n:number){const d=new Date();d.setDate(d.getDate()-n);return d.toISOString().slice(0,10)}
const cmp=(op:string,a:number,b:number)=>op===">"?a>b:op==="<"?a<b:op===">="?a>=b:a<=b;
const fmtMetric=(m:string,v:number)=>m==="roas"?`${v.toFixed(2)}x`:m==="ctr"?`${v.toFixed(2)}%`:m==="frequency"?v.toFixed(1):m==="spend"||m==="cpa"?`R$ ${v.toFixed(2)}`:String(Math.round(v));

export async function logHistory(db:ReturnType<typeof getDb>,e:{workspaceId:string;userId:string;ruleId?:string|null;actor:string;action:string;targetLevel?:string|null;targetId?:string|null;targetName?:string|null;detail?:string|null}){
 try{await db.insert(actionHistory).values({id:crypto.randomUUID(),workspaceId:e.workspaceId,userId:e.userId,ruleId:e.ruleId||null,actor:e.actor,action:e.action,targetLevel:e.targetLevel||null,targetId:e.targetId||null,targetName:e.targetName||null,detail:e.detail||null,createdAt:Math.floor(Date.now()/1000)});}catch(err){console.error("history log",err);}
}

export async function evaluateWorkspace(opts:{userId:string;workspaceId:string;execute:boolean;ruleIds?:string[]}){
 const db=getDb(),now=Math.floor(Date.now()/1000);
 const allRules=await db.select().from(automationRules).where(and(eq(automationRules.workspaceId,opts.workspaceId),eq(automationRules.userId,opts.userId)));
 const rules=allRules.filter(r=>(r.active===1||(r.active as unknown)===true)&&(!opts.ruleIds||opts.ruleIds.includes(r.id)));
 if(!rules.length)return {rules:0,evaluated:0,triggered:[],errors:[] as string[]};
 const links=await db.select({adAccountId:metaLinked.adAccountId}).from(metaLinked).where(eq(metaLinked.userId,opts.userId));
 const linkedIds=links.map(l=>l.adAccountId);
 if(!linkedIds.length)return {rules:rules.length,evaluated:0,triggered:[],errors:["Nenhuma conta Meta vinculada."]};
 const accounts=await db.select().from(metaAccounts).where(and(eq(metaAccounts.userId,opts.userId),inArray(metaAccounts.adAccountId,linkedIds)));
 if(!accounts.length)return {rules:rules.length,evaluated:0,triggered:[],errors:["Nenhuma conta com token."]};
 const maxWindow=Math.min(30,Math.max(...rules.map(r=>r.windowDays||7)));
 const winStart=now-maxWindow*86400;
 const prows=await db.select({id:projects.id}).from(projects).where(eq(projects.workspaceId,opts.workspaceId));
 const pids=prows.map(p=>p.id);
 const tbRows=pids.length?await db.select({utmCampaign:events.utmCampaign,utmContent:events.utmContent,utmTerm:events.utmTerm,value:events.value}).from(events).where(and(inArray(events.projectId,pids),eq(events.eventName,"Purchase"),gte(events.occurredAt,winStart))):[];
 type Agg={sales:number;revenue:number};
 const agg={campaign:new Map<string,Agg>(),adset:new Map<string,Agg>(),ad:new Map<string,Agg>()};
 const add=(m:Map<string,Agg>,k:string,v:number)=>{if(!k)return;const e=m.get(k)||{sales:0,revenue:0};e.sales+=1;e.revenue+=v;m.set(k,e);};
 for(const r of tbRows){
  const c=String(r.utmCampaign||""),t=String(r.utmTerm||""),o=String(r.utmContent||"");
  for(const k of [norm(c)])add(agg.campaign,k,num(r.value));
  const mc=c.match(/\|(\d+)/);if(mc)add(agg.campaign,mc[1],num(r.value));
  for(const k of [norm(t)])add(agg.adset,k,num(r.value));
  const mt=t.match(/\|(\d+)/);if(mt)add(agg.adset,mt[1],num(r.value));
  for(const k of [norm(o)])add(agg.ad,k,num(r.value));
  const mo=o.match(/\|(\d+)/);if(mo)add(agg.ad,mo[1],num(r.value));
 }
 const triggered:any[]=[],errors:string[]=[];
 let evaluated=0;
 for(const rule of rules){
  const level=rule.level as "campaign"|"adset"|"ad";
  const since=isoDaysAgo(rule.windowDays||7),until=isoDaysAgo(1);
  const settled=await Promise.allSettled(accounts.map(async a=>{
   const token=await accountToken(a);
   return {a,rows:await levelTotals(token,a.adAccountId,level,since,until)};
  }));
  for(const s of settled){
   if(s.status!=="fulfilled"){errors.push("Falha ao ler insights de uma conta.");continue;}
   const{a,rows}=s.value;
   const token=await accountToken(a);
   for(const row of rows){
    if(!row.id)continue;
    if(row.spend<(rule.minSpend||0))continue;
    evaluated++;
    const g=agg[level].get(norm(row.name))||agg[level].get(row.id)||{sales:0,revenue:0};
    const ctr=row.impressions>0?row.clicks/row.impressions*100:0;
    const freq=row.reach>0?row.impressions/row.reach:row.impressions;
    const val=rule.metric==="roas"?(row.spend>0?g.revenue/row.spend:Number.POSITIVE_INFINITY)
     :rule.metric==="cpa"?(g.sales>0?row.spend/g.sales:Number.POSITIVE_INFINITY)
     :rule.metric==="spend"?row.spend
     :rule.metric==="ctr"?ctr
     :rule.metric==="frequency"?freq:g.sales;
    if(!cmp(rule.operator,val,rule.value))continue;
    const cool=(rule.lastTriggeredAt||0)+(rule.cooldownHours||24)*3600;
    const label=`${rule.name}: ${row.name} ${rule.metric}=${fmtMetric(rule.metric,val)} ${rule.operator} ${rule.value}`;
    if(opts.execute&&now<cool){triggered.push({rule:rule.name,item:row.name,level,metric:rule.metric,value:Math.round(val*100)/100,action:"cooldown",ok:true,detail:"Dentro do intervalo mínimo."});continue;}
    if(!opts.execute){triggered.push({rule:rule.name,item:row.name,level,metric:rule.metric,value:Math.round(val*100)/100,action:rule.action,ok:true,detail:"Simulação — nada executado."});continue;}
    try{
     if(rule.action==="notify"){
      await pushToWorkspace(opts.workspaceId,{title:`Regra: ${rule.name}`,body:`${row.name}: ${rule.metric} ${fmtMetric(rule.metric,val)}`,url:"/meta-lab",tag:`tb-rule-${rule.id}-${row.id}`});
      await logHistory(db,{workspaceId:opts.workspaceId,userId:opts.userId,ruleId:rule.id,actor:"rule",action:"notify",targetLevel:level,targetId:row.id,targetName:row.name,detail:label});
      triggered.push({rule:rule.name,item:row.name,level,metric:rule.metric,value:Math.round(val*100)/100,action:"notify",ok:true});
     }else{
      const status=rule.action==="pause"?"PAUSED":"ACTIVE";
      const obj=await metaJson<{account_id?:string}>(graph(row.id,{fields:"account_id"},token));
      if(String(obj.account_id||"").replace("act_","")!==a.adAccountId)throw new Error("Item fora da conta.");
      await metaJson(graph(row.id,{status},token),{method:"POST"});
      await logHistory(db,{workspaceId:opts.workspaceId,userId:opts.userId,ruleId:rule.id,actor:"rule",action:rule.action,targetLevel:level,targetId:row.id,targetName:row.name,detail:label});
      triggered.push({rule:rule.name,item:row.name,level,metric:rule.metric,value:Math.round(val*100)/100,action:rule.action,ok:true});
     }
     await db.update(automationRules).set({lastTriggeredAt:now,updatedAt:now}).where(and(eq(automationRules.id,rule.id),eq(automationRules.workspaceId,opts.workspaceId)));
    }catch(err){errors.push(`${rule.name} / ${row.name}: ${err instanceof Error?err.message:"falha"}`);}
   }
  }
 }
 return {rules:rules.length,evaluated,triggered,errors};
}
