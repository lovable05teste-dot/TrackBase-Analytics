import { and,eq,inArray } from "drizzle-orm";
import { ensureDb,getDb } from "@/db";
import { metaAccounts,metaLinked } from "@/db/schema";
import { metaConfig,metaJson } from "@/lib/meta";
import { accountToken,graph } from "@/lib/meta-lab";
import { decryptSecret,requestUserId,sha256 } from "@/lib/trackbase-security";

export const dynamic="force-dynamic";
type Audience={id:string;name:string;approximate_count?:number;time_updated?:number};

export async function GET(request:Request){
 try{
  const userId=await requestUserId(request);if(!userId)return Response.json({error:"Não autenticado"},{status:401});
  await ensureDb();
  const db=getDb();
  const links=await db.select({adAccountId:metaLinked.adAccountId}).from(metaLinked).where(eq(metaLinked.userId,userId));
  const linkedIds=links.map(l=>l.adAccountId);
  if(!linkedIds.length)return Response.json({audiences:[]});
  const accounts=await db.select().from(metaAccounts).where(and(eq(metaAccounts.userId,userId),inArray(metaAccounts.adAccountId,linkedIds)));
  const settled=await Promise.allSettled(accounts.map(async a=>{
   const token=await accountToken(a);
   const b=await metaJson<{data:Audience[]}>(graph(`act_${a.adAccountId}/customaudiences`,{fields:"id,name,approximate_count,time_updated",limit:"100"},token));
   return (b.data||[]).map(x=>({...x,accountName:a.accountName,adAccountId:a.adAccountId}));
  }));
  return Response.json({audiences:settled.flatMap(s=>s.status==="fulfilled"?s.value:[])});
 }catch(e){return Response.json({error:e instanceof Error?e.message:"Falha ao listar públicos."},{status:400})}
}

export async function POST(request:Request){
 try{
  const userId=await requestUserId(request);if(!userId)return Response.json({error:"Não autenticado"},{status:401});
  const body=await request.json().catch(()=>({})) as {accountId?:string;pixelId?:string;name?:string;days?:number};
  const name=String(body.name||"").trim().slice(0,100);
  const pixelId=String(body.pixelId||"").replace(/\D/g,"");
  const days=Math.min(180,Math.max(1,Math.round(Number(body.days||180))));
  if(!name||!pixelId||!body.accountId)return Response.json({error:"Conta, Pixel e nome são obrigatórios."},{status:400});
  await ensureDb();
  const db=getDb();
  const[account]=await db.select().from(metaAccounts).where(and(eq(metaAccounts.id,body.accountId),eq(metaAccounts.userId,userId))).limit(1);
  if(!account)return Response.json({error:"Conta não encontrada."},{status:404});
  const linked=await db.select({adAccountId:metaLinked.adAccountId}).from(metaLinked).where(eq(metaLinked.userId,userId));
  if(!linked.some(l=>l.adAccountId===account.adAccountId))return Response.json({error:"Vincule a conta primeiro."},{status:400});
  const token=await decryptSecret(account.accessTokenCipher,account.accessTokenIv);
  const rule={inclusions:{operator:"or",rules:[{event_sources:[{id:pixelId,type:"pixel"}],retention_days:days,filter:{operator:"and",filters:[{field:"event",operator:"eq",value:"Purchase"}]}}]}};
  const form=new URLSearchParams({name,rule:JSON.stringify(rule),prefill:"true",access_token:token});
  const created=await metaJson<{id:string}>(`https://graph.facebook.com/${metaConfig().version}/act_${account.adAccountId}/customaudiences`,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:form.toString()});
  return Response.json({ok:true,id:created.id,name},{status:201});
 }catch(e){console.error("audiences create",e);return Response.json({error:e instanceof Error?e.message:"A Meta recusou criar o público."},{status:400})}
}
