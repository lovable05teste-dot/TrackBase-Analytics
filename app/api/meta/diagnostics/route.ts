import { and,eq,gte,inArray } from "drizzle-orm";
import { ensureDb,getDb } from "@/db";
import { events,metaAccounts,metaLinked,projects } from "@/db/schema";
import { metaJson } from "@/lib/meta";
import { accountToken,adDailyInsights,adTotals,graph,isoDaysAgo,norm,num,rangeLast } from "@/lib/meta-lab";
import { requestUserId,sha256 } from "@/lib/trackbase-security";

export const dynamic="force-dynamic";
type Creative={id:string;name:string;creative?:{object_story_spec?:{link_data?:{link?:string}}}};

export async function GET(request:Request){
 try{
  const userId=await requestUserId(request);if(!userId)return Response.json({error:"Não autenticado."},{status:401});
  await ensureDb();
  const db=getDb(),workspaceId="ws_"+(await sha256(userId)).slice(0,24);
  const links=await db.select({adAccountId:metaLinked.adAccountId}).from(metaLinked).where(eq(metaLinked.userId,userId));
  const linkedIds=links.map(l=>l.adAccountId);
  if(!linkedIds.length)return Response.json({error:"Vincule uma conta Meta primeiro."},{status:400});
  const accounts=await db.select().from(metaAccounts).where(and(eq(metaAccounts.userId,userId),inArray(metaAccounts.adAccountId,linkedIds)));
  if(!accounts.length)return Response.json({error:"Nenhuma conta vinculada com token."},{status:400});
  const prows=await db.select({id:projects.id}).from(projects).where(eq(projects.workspaceId,workspaceId));
  const pids=prows.map(p=>p.id);
  const start7=Math.floor(Date.now()/1000)-6*86400;
  const tbRows=pids.length?await db.select({utm:events.utmCampaign,value:events.value}).from(events).where(and(inArray(events.projectId,pids),eq(events.eventName,"Purchase"),gte(events.occurredAt,start7))):[];
  const tbByKey=new Map<string,{sales:number;revenue:number}>();
  for(const r of tbRows){const raw=String(r.utm||"");const keys=[norm(raw)];const m=raw.match(/\|(\d+)/);if(m)keys.push(m[1]);for(const k of keys){if(!k)continue;const e=tbByKey.get(k)||{sales:0,revenue:0};e.sales+=1;e.revenue+=num(r.value);tbByKey.set(k,e);}}
  const {since,until}=rangeLast(14);
  const settled=await Promise.allSettled(accounts.map(async a=>{
   const token=await accountToken(a);
   const[totals,daily,creatives]=await Promise.all([
    adTotals(token,a.adAccountId,"last_7d"),
    adDailyInsights(token,a.adAccountId,since,until),
    metaJson<{data:Creative[]}>(graph(`act_${a.adAccountId}/ads`,{fields:"id,name,creative{object_story_spec{link_data{link}}}",limit:"200"},token)).catch(()=>({data:[]} as {data:Creative[]})),
   ]);
   return {a,totals,daily,creatives:creatives.data||[]};
  }));
  const fatigue:any[]=[],quality:any[]=[],utmIssues:any[]=[],compareMap=new Map<string,any>(),winners:any[]=[];
  for(const s of settled){
   if(s.status!=="fulfilled")continue;
   const{a,totals,daily,creatives}=s.value;
   const byId=new Map<string,typeof daily>();
   for(const d of daily){const arr=byId.get(d.itemId)||[];arr.push(d);byId.set(d.itemId,arr);}
   for(const t of totals){
    const rows=(byId.get(t.id)||[]).sort((x,y)=>x.date.localeCompare(y.date));
    const prev=rows.slice(0,7),recent=rows.slice(7);
    const sum=(rs:typeof rows,k:"spend"|"impressions"|"clicks")=>rs.reduce((s2,r)=>s2+r[k],0);
    const wavg=(rs:typeof rows,k:"frequency"|"ctr")=>{const w=rs.reduce((s2,r)=>s2+r.impressions,0);return w?rs.reduce((s2,r)=>s2+r[k]*r.impressions,0)/w:0};
    const spend7=sum(recent,"spend");
    if(spend7>=20&&prev.length&&recent.length){
     const f0=wavg(prev,"frequency"),f1=wavg(recent,"frequency"),c0=wavg(prev,"ctr"),c1=wavg(recent,"ctr");
     const freqUp=f0>0&&f1>f0*1.2,ctrDown=c0>0&&c1<c0*0.85;
     if(freqUp&&ctrDown)fatigue.push({accountName:a.accountName,adId:t.id,adName:t.name,campaignName:t.campaignName,spend7:Math.round(spend7*100)/100,freqPrev:Math.round(f0*10)/10,freqRecent:Math.round(f1*10)/10,ctrPrev:Math.round(c0*100)/100,ctrRecent:Math.round(c1*100)/100,verdict:"Frequência subindo e CTR caindo — criativo pode estar cansando."});
    }
    const bad=[t.quality==="BELOW_AVERAGE"?"qualidade":null,t.engagement==="BELOW_AVERAGE"?"engajamento":null,t.conversion==="BELOW_AVERAGE"?"conversão":null].filter(Boolean);
    if(bad.length&&t.impressions>1000)quality.push({accountName:a.accountName,adId:t.id,adName:t.name,campaignName:t.campaignName,impressions:t.impressions,flags:bad});
    const rev=t.revenue||tbByKey.get(norm(t.name))?.revenue||tbByKey.get(t.campaignId)?.revenue||0;
    const roas=t.spend>0?rev/t.spend:0;
    if(t.spend>=10&&rev>0)winners.push({accountRowId:a.id,accountName:a.accountName,adId:t.id,adName:t.name,campaignName:t.campaignName,spend:Math.round(t.spend*100)/100,revenue:Math.round(rev*100)/100,roas:Math.round(roas*100)/100});
    const key=`${a.adAccountId}:${t.campaignId}`;
    const c=compareMap.get(key)||{accountName:a.accountName,campaignId:t.campaignId,campaignName:t.campaignName,metaPurchases:0,metaRevenue:0};
    c.metaPurchases+=t.purchases;c.metaRevenue+=t.revenue;compareMap.set(key,c);
   }
   for(const c of creatives){
    const link=c.creative?.object_story_spec?.link_data?.link||"";
    if(!link){utmIssues.push({accountName:a.accountName,adId:c.id,adName:c.name,problem:"Sem link detectável no criativo."});}
    else if(!/utm_(source|campaign|medium)/i.test(link)){utmIssues.push({accountName:a.accountName,adId:c.id,adName:c.name,problem:"Link do anúncio sem parâmetros UTM."});}
   }
  }
  const compare=[...compareMap.values()].map(c=>{
   const tb=tbByKey.get(norm(c.campaignName))||tbByKey.get(String(c.campaignId))||{sales:0,revenue:0};
   const diff=c.metaRevenue>0?Math.round((c.metaRevenue-tb.revenue)/c.metaRevenue*100):null;
   return {...c,metaRevenue:Math.round(c.metaRevenue*100)/100,tbSales:tb.sales,tbRevenue:Math.round(tb.revenue*100)/100,diff};
  }).sort((a,b)=>b.metaRevenue-a.metaRevenue);
  winners.sort((a,b)=>b.roas-a.roas);
  return Response.json({fatigue:fatigue.slice(0,30),quality:quality.slice(0,30),utmIssues:utmIssues.slice(0,50),utmChecked:true,compare:compare.slice(0,50),winners:winners.slice(0,10),generatedAt:Math.floor(Date.now()/1000)});
 }catch(e){console.error("Meta diagnostics",e);return Response.json({error:e instanceof Error?e.message:"Falha no diagnóstico."},{status:400})}
}
