import { and, eq } from "drizzle-orm";
import { ensureDb, getDb } from "../../../../db";
import { projects } from "../../../../db/schema";
import { encryptSecret, hasActivePlan, planRequiredResponse, requestUserId, sha256 } from "../../../../lib/trackbase-security";

export async function POST(request: Request) {
  await ensureDb();
  const userId = await requestUserId(request);
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });
  if (!(await hasActivePlan(userId))) return planRequiredResponse();
  const body = await request.json() as { projectId?: string; pixelId?: string; accessToken?: string; testCode?: string };
  if (!body.projectId || !/^\d{6,25}$/.test(body.pixelId || "") || !body.accessToken?.trim()) {
    return Response.json({ error: "Projeto, Pixel ID e token são obrigatórios" }, { status: 400 });
  }
  const workspaceId = "ws_" + (await sha256(userId)).slice(0, 24);
  const [owned] = await getDb().select({ id: projects.id }).from(projects).where(and(eq(projects.id, body.projectId), eq(projects.workspaceId, workspaceId))).limit(1);
  if (!owned) return Response.json({ error: "Projeto não encontrado" }, { status: 404 });
  // Tokens gerados em “API de Conversões” podem enviar eventos para /events,
  // mas não têm permissão para consultar os dados do Pixel. Validá-los com
  // GET /{pixel_id} causava o falso erro (#100 Missing Permission). Guardamos o
  // token criptografado e a validação real acontece no primeiro envio CAPI.
  const encrypted = await encryptSecret(body.accessToken.trim());
  await getDb().update(projects).set({ pixelId: body.pixelId, metaTokenCipher: encrypted.cipher, metaTokenIv: encrypted.iv, metaTestCode: body.testCode?.trim() || null, metaConnectedAt: new Date().toISOString() }).where(eq(projects.id, body.projectId));
  return Response.json({ connected: true, pixelId: body.pixelId, message: "Pixel e token conectados com segurança." });
}

export async function DELETE(request:Request){
  await ensureDb();const userId=await requestUserId(request);if(!userId)return Response.json({error:"Não autenticado"},{status:401});if(!(await hasActivePlan(userId)))return planRequiredResponse();const projectId=new URL(request.url).searchParams.get("projectId");if(!projectId)return Response.json({error:"Projeto não informado"},{status:400});const workspaceId="ws_"+(await sha256(userId)).slice(0,24),[owned]=await getDb().select({id:projects.id}).from(projects).where(and(eq(projects.id,projectId),eq(projects.workspaceId,workspaceId))).limit(1);if(!owned)return Response.json({error:"Projeto não encontrado"},{status:404});await getDb().update(projects).set({pixelId:null,metaTokenCipher:null,metaTokenIv:null,metaTestCode:null,metaConnectedAt:null}).where(eq(projects.id,projectId));return Response.json({disconnected:true,projectId});
}
