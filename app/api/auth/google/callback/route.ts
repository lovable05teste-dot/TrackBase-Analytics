import { and, eq, gte } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { googleOauthStates, users } from "@/db/schema";
import { sha256 } from "@/lib/trackbase-security";

function sessionCookie(token: string){
  const secure=process.env.SECURE_COOKIES==="true"||(!process.env.SECURE_COOKIES&&process.env.NODE_ENV==="production")?" Secure;":"";
  return `tb_session=${token}; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=2592000`;
}

export async function GET(request:Request){
  const fail=(code:string)=>Response.redirect(new URL(`/login?erro=${code}`,request.url),302);
  try{
    await ensureDb();
    const incoming=new URL(request.url);
    if(incoming.searchParams.get("error"))return fail("cancelado");
    const code=incoming.searchParams.get("code")||"";
    const state=incoming.searchParams.get("state")||"";
    if(!code||!state)return fail("retorno");
    const db=getDb();
    const now=Math.floor(Date.now()/1000);
    const [valid]=await db.select().from(googleOauthStates).where(and(eq(googleOauthStates.stateHash,await sha256(state)),gte(googleOauthStates.expiresAt,now))).limit(1);
    if(!valid)return fail("state_invalid");
    await db.delete(googleOauthStates).where(eq(googleOauthStates.id,valid.id));
    const redirectUri=new URL("/api/auth/google/callback",request.url).toString();
    const tokenRes=await fetch("https://oauth2.googleapis.com/token",{
      method:"POST",
      headers:{"Content-Type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID||"",client_secret:process.env.GOOGLE_CLIENT_SECRET||"",code,grant_type:"authorization_code",redirect_uri:redirectUri}),
    });
    const tokens=await tokenRes.json().catch(()=>({})) as {access_token?:string};
    if(!tokens.access_token)return fail("token");
    const profile=await fetch("https://www.googleapis.com/oauth2/v2/userinfo",{headers:{Authorization:`Bearer ${tokens.access_token}`}}).then(r=>r.json()).catch(()=>({})) as {email?:string;verified_email?:boolean};
    const email=String(profile.email||"").trim().toLowerCase();
    if(!email)return fail("email");
    const [existing]=await db.select().from(users).where(eq(users.email,email)).limit(1);
    let passwordHash:string;
    if(existing){passwordHash=existing.passwordHash}
    else{
      passwordHash=await sha256(`google:${email}:${crypto.randomUUID()}`);
      await db.insert(users).values({id:crypto.randomUUID(),email,passwordHash,createdAt:now});
    }
    const token=await sha256(`trackbase:${passwordHash}`);
    return new Response(null,{status:302,headers:{location:new URL("/",request.url).toString(),"set-cookie":sessionCookie(token)}});
  }catch(error){
    console.error("Google OAuth callback",error);
    return fail("internal");
  }
}
