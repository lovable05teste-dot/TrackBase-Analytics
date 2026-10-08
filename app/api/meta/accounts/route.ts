import { and,eq,inArray,isNull,ne,or } from "drizzle-orm";
import { ensureDb,getDb } from "@/db";
import { metaAccounts,metaLinked } from "@/db/schema";
import { metaConfig,metaJson,requireMetaConfig } from "@/lib/meta";
import { decryptSecret, hasActivePlan, hasConflictingOrigin, planRequiredResponse, requestUserId } from "@/lib/trackbase-security";
export const dynamic="force-dynamic";
export async function GET(request:Request){try{const userId=await requestUserId(request);if(!userId)return Response.json({error:"Sua sessão expirou. Entre novamente.",code:"AUTH_REQUIRED"},{status:401});await ensureDb();const db=getDb();const rows=await db.select({id:metaAccounts.id,adAccountId:metaAccounts.adAccountId,name:metaAccounts.accountName,metaUserId:metaAccounts.metaUserId,metaUserName:metaAccounts.metaUserName,currency:metaAccounts.currency,timezoneName:metaAccounts.timezoneName,accountStatus:metaAccounts.accountStatus,tokenExpiresAt:metaAccounts.tokenExpiresAt,connectedAt:metaAccounts.connectedAt}).from(metaAccounts).where(eq(metaAccounts.userId,userId));const links=await db.select({adAccountId:metaLinked.adAccountId}).from(metaLinked).where(eq(metaLinked.userId,userId));const linked=new Set(links.map(l=>l.adAccountId));const config=metaConfig();const accounts=rows.map(r=>({...r,selected:linked.has(r.adAccountId)}));accounts.sort((a,b)=>Number(b.selected)-Number(a.selected)||a.name.localeCompare(b.name,"pt-BR"));return Response.json({configured:Boolean(config.appId&&config.appSecret),configIdConfigured:Boolean(config.configId),callbackUrl:config.redirectUri,appIdSuffix:config.appId.slice(-6),accounts},{headers:{"cache-control":"no-store"}})}catch(error){console.error("Meta accounts GET",error);return Response.json({error:"A conexão de dados está temporariamente indisponível. Tente novamente.",code:"DATA_UNAVAILABLE"},{status:503})}}
export async function POST(request:Request){try{const userId=await requestUserId(request);if(!userId)return Response.json({error:"Não autenticado."},{status:401});if(!(await hasActivePlan(userId)))return planRequiredResponse();await ensureDb();const body=await request.json().catch(()=>({})) as {accountId?:string;enabled?:boolean};if(!body.accountId)return Response.json({error:"Escolha uma conta."},{status:400});const db=getDb();const[exists]=await db.select({id:metaAccounts.id,adAccountId:metaAccounts.adAccountId}).from(metaAccounts).where(and(eq(metaAccounts.id,body.accountId),eq(metaAccounts.userId,userId))).limit(1);if(!exists)return Response.json({error:"Conta não encontrada."},{status:404});const links=await db.select({adAccountId:metaLinked.adAccountId}).from(metaLinked).where(eq(metaLinked.userId,userId));const isLinked=links.some(l=>l.adAccountId===exists.adAccountId);const enabled=typeof body.enabled==="boolean"?body.enabled:!isLinked;if(enabled){await db.insert(metaLinked).values({userId,adAccountId:exists.adAccountId,createdAt:Math.floor(Date.now()/1000)}).onConflictDoNothing();}else{await db.delete(metaLinked).where(and(eq(metaLinked.userId,userId),eq(metaLinked.adAccountId,exists.adAccountId)));}return Response.json({ok:true,enabled})}catch(error){console.error("Meta accounts POST",error);return Response.json({error:"O banco Neon ainda não respondeu. Confira DATABASE_URL na Vercel."},{status:503})}}
// Logout de um login Meta: apaga da GhostScale todas as contas trazidas por
// ele e revoga a autorização do app na Meta (DELETE /me/permissions). Sem a
// revogação, o "Continuar com Facebook" seguinte reaproveitava a permissão
// antiga em silêncio e reconectava o mesmo login — o logout parecia não
// funcionar. A revogação é best-effort: falha na Meta nunca impede a remoção.
// `loginId=sem-login` cobre contas antigas gravadas sem meta_user_id, que
// antes não tinham como ser removidas.
const LEGACY_LOGIN_ID="sem-login";
async function revokeMetaGrant(cipher:string,iv:string){try{const config=requireMetaConfig();const token=await decryptSecret(cipher,iv);const url=new URL(`https://graph.facebook.com/${config.version}/me/permissions`);url.searchParams.set("access_token",token);await metaJson(url.toString(),{method:"DELETE",signal:AbortSignal.timeout(8000)});return true}catch{return false}}
export async function DELETE(request:Request){
 if(hasConflictingOrigin(request))return Response.json({error:"Origem inválida."},{status:403});
 try{
 const userId=await requestUserId(request);
 if(!userId)return Response.json({error:"Sua sessão expirou. Entre novamente.",code:"AUTH_REQUIRED"},{status:401});
 await ensureDb();const db=getDb();
 const loginId=new URL(request.url).searchParams.get("loginId")?.trim();
 if(!loginId)return Response.json({error:"Login Meta não informado."},{status:400});
 const legacy=loginId===LEGACY_LOGIN_ID;
 const owner=and(eq(metaAccounts.userId,userId),legacy?or(isNull(metaAccounts.metaUserId),eq(metaAccounts.metaUserId,"")):eq(metaAccounts.metaUserId,loginId));
 const accounts=await db.select({adAccountId:metaAccounts.adAccountId,cipher:metaAccounts.accessTokenCipher,iv:metaAccounts.accessTokenIv}).from(metaAccounts).where(owner);
 if(!accounts.length)return Response.json({error:"Este login Meta já foi removido. Atualize a página."},{status:404});
 // Só revoga se nenhum outro usuário da GhostScale usa o mesmo login Meta:
 // a revogação vale para o app inteiro e derrubaria a conexão dele também.
 let revoked=false;
 if(!legacy){const[shared]=await db.select({id:metaAccounts.id}).from(metaAccounts).where(and(eq(metaAccounts.metaUserId,loginId),ne(metaAccounts.userId,userId))).limit(1);if(!shared)revoked=await revokeMetaGrant(accounts[0].cipher,accounts[0].iv)}
 const adAccountIds=[...new Set(accounts.map(account=>account.adAccountId))];
 await db.delete(metaAccounts).where(owner);
 await db.delete(metaLinked).where(and(eq(metaLinked.userId,userId),inArray(metaLinked.adAccountId,adAccountIds)));
 return Response.json({deleted:true,loginId,accountsRemoved:accounts.length,revoked});
 }catch(error){console.error("Meta accounts DELETE",error);return Response.json({error:"Não foi possível desconectar. Tente novamente."},{status:503})}
}
