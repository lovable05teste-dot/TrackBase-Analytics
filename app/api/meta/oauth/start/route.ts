import { getRawDb } from "@/db";
import { requireMetaConfig } from "@/lib/meta";
import { requestUserId, sha256 } from "@/lib/trackbase-security";

export async function GET(request:Request){
  const userId=await requestUserId(request);
  if(!userId) return Response.redirect(new URL("/signin-with-chatgpt?return_to=/contas-meta",request.url),302);
  try{
    const config=requireMetaConfig();
    const state=crypto.randomUUID()+crypto.randomUUID();
    const now=Math.floor(Date.now()/1000);
    const db=getRawDb();
    await db.batch([
      db.prepare("DELETE FROM meta_oauth_states WHERE expires_at < ?").bind(now),
      db.prepare("INSERT INTO meta_oauth_states (id,user_id,state_hash,expires_at,created_at) VALUES (?,?,?,?,?)").bind(crypto.randomUUID(),userId,await sha256(state),now+600,now),
    ]);
    const redirectUri=new URL("/api/meta/oauth/callback",request.url).toString();
    const url=new URL(`https://www.facebook.com/${config.version}/dialog/oauth`);
    url.searchParams.set("client_id",config.appId);
    url.searchParams.set("redirect_uri",redirectUri);
    url.searchParams.set("state",state);
    url.searchParams.set("response_type","code");
    url.searchParams.set("scope","ads_read,ads_management,business_management");
    if(config.configId) url.searchParams.set("config_id",config.configId);
    return Response.redirect(url,302);
  }catch(error){
    const code=error instanceof Error&&error.message==="META_NOT_CONFIGURED"?"config":"start";
    return Response.redirect(new URL(`/contas-meta?erro=${code}`,request.url),302);
  }
}
