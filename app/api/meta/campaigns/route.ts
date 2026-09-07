import { and, eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { events, metaAccounts, projects } from "@/db/schema";
import { metaConfig, metaJson } from "@/lib/meta";
import { decryptSecret, requestUserId, sha256 } from "@/lib/trackbase-security";

type Insight={date_start?:string;spend?:string;clicks?:string;impressions?:string;cpc?:string;cpm?:string;campaign_id?:string;campaign_name?:string};
type Campaign={id:string;name:string;status?:string;effective_status?:string;insights?:{data?:Insight[]}};
type CampaignPage={data:Campaign[];paging?:{next?:string}};

async function campaignsFor(account:{id:string;adAccountId:string;accountName:string;currency:string|null;accessTokenCipher:string;accessTokenIv:string},selection:{preset:string;start?:string;end?:string}){
  const token=await decryptSecret(account.accessTokenCipher,account.accessTokenIv),config=metaConfig();
  const timeRange=selection.start&&selection.end?{since:selection.start,until:selection.end}:null,insightField=timeRange?`insights.time_range(${JSON.stringify(timeRange)}){spend,clicks,impressions,cpc,cpm}`:`insights.date_preset(${selection.preset}){spend,clicks,impressions,cpc,cpm}`,campaignParams=new URLSearchParams({fields:`id,name,status,effective_status,${insightField}`,limit:"200",access_token:token});
  let next=`https://graph.facebook.com/${config.version}/act_${account.adAccountId}/campaigns?${campaignParams}`;
  const rows:Campaign[]=[];
  for(let page=0;next&&page<5;page++){const response=await metaJson<CampaignPage>(next);rows.push(...response.data);next=response.paging?.next||""}
  const dailyParams=new URLSearchParams({level:"campaign",time_increment:"1",fields:"campaign_id,campaign_name,date_start,spend,clicks,impressions,cpc,cpm",limit:"500",access_token:token});if(timeRange)dailyParams.set("time_range",JSON.stringify(timeRange));else dailyParams.set("date_preset",selection.preset);const dailyUrl=`https://graph.facebook.com/${config.version}/act_${account.adAccountId}/insights?${dailyParams}`;
  const daily=await metaJson<{data:Insight[]}>(dailyUrl);
  return {campaigns:rows.map(c=>{const i=c.insights?.data?.[0]||{};return {id:c.id,name:c.name,status:c.effective_status||c.status||"UNKNOWN",accountId:account.id,adAccountId:account.adAccountId,accountName:account.accountName,currency:account.currency||"BRL",spend:Number(i.spend||0),clicks:Number(i.clicks||0),impressions:Number(i.impressions||0),cpc:Number(i.cpc||0),cpm:Number(i.cpm||0)}}),daily:daily.data.map(i=>({date:i.date_start||"",campaignId:i.campaign_id||"",campaignName:i.campaign_name||"",accountName:account.accountName,currency:account.currency||"BRL",spend:Number(i.spend||0),clicks:Number(i.clicks||0),impressions:Number(i.impressions||0),cpc:Number(i.cpc||0)}))};
}

export async function GET(request:Request){
  try{
    const userId=await requestUserId(request);if(!userId)return Response.json({error:"Não autenticado."},{status:401});
    const params=new URL(request.url).searchParams;const requested=params.get("period")||"last_7d",start=params.get("start")||undefined,end=params.get("end")||undefined;const allowedPeriods=new Set(["today","yesterday","last_7d","last_30d","this_month","last_month","maximum","custom"]);const period=allowedPeriods.has(requested)?requested:"last_7d",selection=period==="custom"&&start&&end?{preset:"maximum",start,end}:{preset:period==="custom"?"maximum":period};
    await ensureDb();const db=getDb(),workspaceId="ws_"+(await sha256(userId)).slice(0,24);
    const accounts=await db.select().from(metaAccounts).where(and(eq(metaAccounts.userId,userId),eq(metaAccounts.selected,true)));
    if(!accounts.length)return Response.json({campaigns:[],accounts:0,message:"Vincule pelo menos uma conta em Integrações."});
    const settled=await Promise.allSettled(accounts.map(a=>campaignsFor(a,selection)));
    const campaigns=settled.flatMap(r=>r.status==="fulfilled"?r.value.campaigns:[]),daily=settled.flatMap(r=>r.status==="fulfilled"?r.value.daily:[]);
    const failures=settled.flatMap((r,i)=>r.status==="rejected"?[{account:accounts[i].accountName,error:r.reason instanceof Error?r.reason.message:"Falha na Meta"}]:[]);
    const projectRows=await db.select({id:projects.id}).from(projects).where(eq(projects.workspaceId,workspaceId));
    const tracked=projectRows.length?await db.select({projectId:events.projectId,eventName:events.eventName,utmCampaign:events.utmCampaign,value:events.value}).from(events):[];
    const allowed=new Set(projectRows.map(p=>p.id));
    const withTracking=campaigns.map(c=>{const matches=tracked.filter(e=>allowed.has(e.projectId)&&((e.utmCampaign||"").includes(c.id)||(e.utmCampaign||"").includes(c.name)));const purchases=matches.filter(e=>e.eventName==="Purchase");const revenue=purchases.reduce((sum,e)=>sum+Number(e.value||0),0);return {...c,pageViews:matches.filter(e=>e.eventName==="PageView").length,checkouts:matches.filter(e=>e.eventName==="InitiateCheckout").length,sales:purchases.length,revenue,roas:c.spend>0?revenue/c.spend:null}});
    return Response.json({campaigns:withTracking,daily,period,accounts:accounts.length,failures,updatedAt:new Date().toISOString()});
  }catch(error){console.error("Meta campaigns GET",error);return Response.json({error:error instanceof Error?error.message:"Falha ao importar campanhas."},{status:500})}
}
