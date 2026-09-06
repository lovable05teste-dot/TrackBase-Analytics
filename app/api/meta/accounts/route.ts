import { getRawDb } from "@/db";
import { metaConfig } from "@/lib/meta";
import { requestUserId } from "@/lib/trackbase-security";

export async function GET(request:Request){
  try{const userId=await requestUserId(request);if(!userId)return Response.json({error:"Não autenticado."},{status:401});
  const rows=await getRawDb().prepare("SELECT id,ad_account_id AS adAccountId,account_name AS name,currency,timezone_name AS timezoneName,account_status AS accountStatus,selected,token_expires_at AS tokenExpiresAt,connected_at AS connectedAt FROM meta_accounts WHERE user_id=? ORDER BY selected DESC,account_name").bind(userId).all();
  const config=metaConfig();return Response.json({configured:Boolean(config.appId&&config.appSecret),configIdConfigured:Boolean(config.configId),accounts:rows.results});}
  catch(error){console.error("Meta accounts GET",error);return Response.json({error:"O banco de dados das contas Meta ainda não está configurado na Vercel."},{status:503});}
}

export async function POST(request:Request){
  try{const userId=await requestUserId(request);if(!userId)return Response.json({error:"Não autenticado."},{status:401});
  const body=await request.json().catch(()=>({})) as {accountId?:string};
  if(!body.accountId)return Response.json({error:"Escolha uma conta."},{status:400});
  const db=getRawDb();
  const exists=await db.prepare("SELECT id FROM meta_accounts WHERE id=? AND user_id=?").bind(body.accountId,userId).first();
  if(!exists)return Response.json({error:"Conta não encontrada."},{status:404});
  await db.batch([db.prepare("UPDATE meta_accounts SET selected=0 WHERE user_id=?").bind(userId),db.prepare("UPDATE meta_accounts SET selected=1,updated_at=? WHERE id=? AND user_id=?").bind(Math.floor(Date.now()/1000),body.accountId,userId)]);
  return Response.json({ok:true});}
  catch(error){console.error("Meta accounts POST",error);return Response.json({error:"O banco de dados das contas Meta ainda não está configurado na Vercel."},{status:503});}
}
