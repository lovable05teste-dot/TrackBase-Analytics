import { lt } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { googleOauthStates } from "@/db/schema";
import { sha256 } from "@/lib/trackbase-security";

export async function GET(request:Request){
  try{
    const clientId=process.env.GOOGLE_CLIENT_ID;
    if(!clientId)return Response.redirect(new URL("/login?erro=config",request.url),302);
    await ensureDb();
    const db=getDb();
    const now=Math.floor(Date.now()/1000);
    await db.delete(googleOauthStates).where(lt(googleOauthStates.expiresAt,now));
    const state=crypto.randomUUID()+crypto.randomUUID();
    await db.insert(googleOauthStates).values({id:crypto.randomUUID(),userId:"pending",stateHash:await sha256(state),expiresAt:now+600,createdAt:now});
    const redirectUri=new URL("/api/auth/google/callback",request.url).toString();
    const url=new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id",clientId);
    url.searchParams.set("redirect_uri",redirectUri);
    url.searchParams.set("state",state);
    url.searchParams.set("response_type","code");
    url.searchParams.set("scope","openid email profile");
    url.searchParams.set("access_type","online");
    url.searchParams.set("prompt","select_account");
    return Response.redirect(url,302);
  }catch(error){
    console.error("Google OAuth start",error);
    return Response.redirect(new URL("/login?erro=start",request.url),302);
  }
}
