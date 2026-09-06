import { getRawDb } from "@/db";
import { metaJson, requireMetaConfig } from "@/lib/meta";
import { encryptSecret, requestUserId, sha256 } from "@/lib/trackbase-security";

type Token={access_token:string;expires_in?:number};
type MetaUser={id:string;name?:string};
type AdAccounts={data:Array<{id:string;account_id:string;name?:string;currency?:string;timezone_name?:string;account_status?:number}>};

export async function GET(request:Request){
  const userId=await requestUserId(request);
  if(!userId) return Response.redirect(new URL("/signin-with-chatgpt?return_to=/contas-meta",request.url),302);
  const incoming=new URL(request.url);
  if(incoming.searchParams.get("error")) return Response.redirect(new URL("/contas-meta?erro=cancelado",request.url),302);
  const code=incoming.searchParams.get("code")||"";
  const state=incoming.searchParams.get("state")||"";
  if(!code||!state) return Response.redirect(new URL("/contas-meta?erro=retorno",request.url),302);
  try{
    const db=getRawDb();
    const stateHash=await sha256(state);
    const now=Math.floor(Date.now()/1000);
    const valid=await db.prepare("SELECT id FROM meta_oauth_states WHERE user_id=? AND state_hash=? AND expires_at>=? LIMIT 1").bind(userId,stateHash,now).first<{id:string}>();
    if(!valid) throw new Error("STATE_INVALID");
    await db.prepare("DELETE FROM meta_oauth_states WHERE id=?").bind(valid.id).run();
    const config=requireMetaConfig();
    const redirectUri=new URL("/api/meta/oauth/callback",request.url).toString();
    const exchange=new URL(`https://graph.facebook.com/${config.version}/oauth/access_token`);
    exchange.searchParams.set("client_id",config.appId);exchange.searchParams.set("client_secret",config.appSecret);exchange.searchParams.set("redirect_uri",redirectUri);exchange.searchParams.set("code",code);
    const shortToken=await metaJson<Token>(exchange.toString());
    const longUrl=new URL(`https://graph.facebook.com/${config.version}/oauth/access_token`);
    longUrl.searchParams.set("grant_type","fb_exchange_token");longUrl.searchParams.set("client_id",config.appId);longUrl.searchParams.set("client_secret",config.appSecret);longUrl.searchParams.set("fb_exchange_token",shortToken.access_token);
    let token=shortToken;
    try{token=await metaJson<Token>(longUrl.toString());}catch{token=shortToken;}
    const graph=new URL(`https://graph.facebook.com/${config.version}/me`);graph.searchParams.set("fields","id,name");graph.searchParams.set("access_token",token.access_token);
    const accountUrl=new URL(`https://graph.facebook.com/${config.version}/me/adaccounts`);accountUrl.searchParams.set("fields","id,account_id,name,currency,timezone_name,account_status");accountUrl.searchParams.set("limit","200");accountUrl.searchParams.set("access_token",token.access_token);
    const [metaUser,accounts]=await Promise.all([metaJson<MetaUser>(graph.toString()),metaJson<AdAccounts>(accountUrl.toString())]);
    const secured=await encryptSecret(token.access_token);
    const workspaceId="ws_"+(await sha256(userId)).slice(0,24);
    const expiresAt=token.expires_in?now+token.expires_in:null;
    const statements=accounts.data.map(account=>db.prepare(`INSERT INTO meta_accounts (id,workspace_id,user_id,meta_user_id,meta_user_name,ad_account_id,account_name,currency,timezone_name,account_status,access_token_cipher,access_token_iv,token_expires_at,selected,connected_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,ad_account_id) DO UPDATE SET meta_user_id=excluded.meta_user_id,meta_user_name=excluded.meta_user_name,account_name=excluded.account_name,currency=excluded.currency,timezone_name=excluded.timezone_name,account_status=excluded.account_status,access_token_cipher=excluded.access_token_cipher,access_token_iv=excluded.access_token_iv,token_expires_at=excluded.token_expires_at,updated_at=excluded.updated_at`).bind(crypto.randomUUID(),workspaceId,userId,metaUser.id,metaUser.name||null,account.account_id,account.name||`Conta ${account.account_id}`,account.currency||null,account.timezone_name||null,account.account_status??null,secured.cipher,secured.iv,expiresAt,false,now,now));
    if(statements.length) await db.batch(statements);
    return Response.redirect(new URL(`/contas-meta?conectado=1&contas=${accounts.data.length}`,request.url),302);
  }catch(error){
    console.error("Meta OAuth callback",error);
    return Response.redirect(new URL("/contas-meta?erro=oauth",request.url),302);
  }
}
