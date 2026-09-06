import { and, eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { events, metaAccounts, projects } from "@/db/schema";
import { metaConfig, metaJson } from "@/lib/meta";
import { decryptSecret, requestUserId, sha256 } from "@/lib/trackbase-security";

type Insight={spend?:string;clicks?:string;impressions?:string;cpc?:string;cpm?:string};
type Campaign={id:string;name:string;status?:string;effective_status?:string;insights?:{data?:Insight[]}};
type CampaignPage={data:Campaign[];paging?:{next?:string}};

async function campaignsFor(account:{id:string;adAccountId:string;accountName:string;currency:string|null;accessTokenCipher:string;accessTokenIv:string}){
  const token=await decryptSecret(account.accessTokenCipher,account.accessTokenIv),config=metaConfig();
  let next=`https://graph.facebook.com/${config.version}/act_${account.adAccountId}/campaigns?fields=id,name,status,effective_status,insights.date_preset(maximum){spend,clicks,impressions,cpc,cpm}&limit=200&access_token=${encodeURIComponent(token)}`;
  const rows:Campaign[]=[];
  for(let page=0;next&&page<5;page++){const response=await metaJson<CampaignPage>(next);rows.push(...response.data);next=response.paging?.next||""}
  return rows.map(c=>{const i=c.insights?.data?.[0]||{};return {id:c.id,name:c.name,status:c.effective_status||c.status||"UNKNOWN",accountId:account.id,adAccountId:account.adAccountId,accountName:account.accountName,currency:account.currency||"BRL",spend:Number(i.spend||0),clicks:Number(i.clicks||0),impressions:Number(i.impressions||0),cpc:Number(i.cpc||0),cpm:Number(i.cpm||0)}});
}

export async function GET(request:Request){
  try{
    const userId=await requestUserId(request);if(!userId)return Response.json({error:"Não autenticado."},{status:401});
    await ensureDb();const db=getDb(),workspaceId="ws_"+(await sha256(userId)).slice(0,24);
    const accounts=await db.select().from(metaAccounts).where(and(eq(metaAccounts.userId,userId),eq(metaAccounts.selected,true)));
    if(!accounts.length)return Response.json({campaigns:[],accounts:0,message:"Vincule pelo menos uma conta em Integrações."});
    const settled=await Promise.allSettled(accounts.map(campaignsFor));
    const campaigns=settled.flatMap(r=>r.status==="fulfilled"?r.value:[]);
    const failures=settled.flatMap((r,i)=>r.status==="rejected"?[{account:accounts[i].accountName,error:r.reason instanceof Error?r.reason.message:"Falha na Meta"}]:[]);
    const projectRows=await db.select({id:projects.id}).from(projects).where(eq(projects.workspaceId,workspaceId));
    const tracked=projectRows.length?await db.select({projectId:events.projectId,eventName:events.eventName,utmCampaign:events.utmCampaign,value:events.value}).from(events):[];
    const allowed=new Set(projectRows.map(p=>p.id));
    const withTracking=campaigns.map(c=>{const matches=tracked.filter(e=>allowed.has(e.projectId)&&((e.utmCampaign||"").includes(c.id)||(e.utmCampaign||"").includes(c.name)));const purchases=matches.filter(e=>e.eventName==="Purchase");const revenue=purchases.reduce((sum,e)=>sum+Number(e.value||0),0);return {...c,pageViews:matches.filter(e=>e.eventName==="PageView").length,checkouts:matches.filter(e=>e.eventName==="InitiateCheckout").length,sales:purchases.length,revenue,roas:c.spend>0?revenue/c.spend:null}});
    return Response.json({campaigns:withTracking,accounts:accounts.length,failures,updatedAt:new Date().toISOString()});
  }catch(error){console.error("Meta campaigns GET",error);return Response.json({error:error instanceof Error?error.message:"Falha ao importar campanhas."},{status:500})}
}
