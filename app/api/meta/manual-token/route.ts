import { ensureDb,getDb } from "@/db";
import { metaAccounts } from "@/db/schema";
import { metaJson,requireMetaConfig } from "@/lib/meta";
import { encryptSecret,requestUserId,sha256 } from "@/lib/trackbase-security";
type Token={access_token:string;expires_in?:number};type MetaUser={id:string;name?:string};type AdAccounts={data:Array<{account_id:string;name?:string;currency?:string;timezone_name?:string;account_status?:number}>};
export async function POST(request:Request){
 const userId=await requestUserId(request);if(!userId)return Response.json({error:"Não autenticado"},{status:401});
 const body=await request.json().catch(()=>({})) as {accessToken?:string};const pasted=(body.accessToken||"").trim();
 if(!pasted)return Response.json({error:"Cole o token gerado no Graph API Explorer."},{status:400});
 try{
  await ensureDb();const config=requireMetaConfig(),db=getDb(),now=Math.floor(Date.now()/1000);
  let token:Token={access_token:pasted};let longLived=false;
  try{const longUrl=new URL(`https://graph.facebook.com/${config.version}/oauth/access_token`);longUrl.searchParams.set("grant_type","fb_exchange_token");longUrl.searchParams.set("client_id",config.appId);longUrl.searchParams.set("client_secret",config.appSecret);longUrl.searchParams.set("fb_exchange_token",pasted);token=await metaJson<Token>(longUrl.toString());longLived=Boolean(token.expires_in&&token.expires_in>86400)}catch{}
  const graph=new URL(`https://graph.facebook.com/${config.version}/me`);graph.searchParams.set("fields","id,name");graph.searchParams.set("access_token",token.access_token);
  const accountUrl=new URL(`https://graph.facebook.com/${config.version}/me/adaccounts`);accountUrl.searchParams.set("fields","account_id,name,currency,timezone_name,account_status");accountUrl.searchParams.set("limit","200");accountUrl.searchParams.set("access_token",token.access_token);
  const[metaUser,accounts]=await Promise.all([metaJson<MetaUser>(graph.toString()),metaJson<AdAccounts>(accountUrl.toString())]);
  if(!accounts.data?.length)return Response.json({error:"Token válido, mas nenhuma conta de anúncio encontrada para este usuário da Meta.",metaUser:metaUser.name||null},{status:400});
  const secured=await encryptSecret(token.access_token),workspaceId="ws_"+(await sha256(userId)).slice(0,24),expiresAt=token.expires_in?now+token.expires_in:null;
  for(const account of accounts.data)await db.insert(metaAccounts).values({id:crypto.randomUUID(),workspaceId,userId,metaUserId:metaUser.id,metaUserName:metaUser.name||null,adAccountId:account.account_id,accountName:account.name||`Conta ${account.account_id}`,currency:account.currency||null,timezoneName:account.timezone_name||null,accountStatus:account.account_status??null,accessTokenCipher:secured.cipher,accessTokenIv:secured.iv,tokenExpiresAt:expiresAt,selected:0,connectedAt:now,updatedAt:now}).onConflictDoUpdate({target:[metaAccounts.userId,metaAccounts.adAccountId],set:{metaUserId:metaUser.id,metaUserName:metaUser.name||null,accountName:account.name||`Conta ${account.account_id}`,currency:account.currency||null,timezoneName:account.timezone_name||null,accountStatus:account.account_status??null,accessTokenCipher:secured.cipher,accessTokenIv:secured.iv,tokenExpiresAt:expiresAt,updatedAt:now}});
  return Response.json({connected:true,accounts:accounts.data.length,metaUser:metaUser.name||null,validUntil:expiresAt,longLived});
 }catch(error){console.error("Meta manual token",error);return Response.json({error:error instanceof Error?error.message:"A Meta recusou o token. Gere novamente com as permissões ads_read e ads_management."},{status:400})}
}