import { and, eq } from "drizzle-orm";
import { ensureDb, getDb } from "../../../../db";
import { projects } from "../../../../db/schema";
import { encryptSecret, requestUserId, sha256 } from "../../../../lib/trackbase-security";

export async function POST(request: Request) {
  await ensureDb();
  const userId = await requestUserId(request);
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const body = await request.json() as { projectId?: string; pixelId?: string; accessToken?: string; testCode?: string };
  if (!body.projectId || !/^\d{6,25}$/.test(body.pixelId || "") || !body.accessToken?.trim()) {
    return Response.json({ error: "Projeto, Pixel ID e token são obrigatórios" }, { status: 400 });
  }
  const workspaceId = "ws_" + (await sha256(userId)).slice(0, 24);
  const [owned] = await getDb().select({ id: projects.id }).from(projects).where(and(eq(projects.id, body.projectId), eq(projects.workspaceId, workspaceId))).limit(1);
  if (!owned) return Response.json({ error: "Projeto não encontrado" }, { status: 404 });
  const check = await fetch(`https://graph.facebook.com/v25.0/${body.pixelId}?fields=id&access_token=${encodeURIComponent(body.accessToken.trim())}`);
  if (!check.ok) {
    const detail = await check.json().catch(() => ({})) as { error?: { code?: number; message?: string; fbtrace_id?: string } };
    const code = detail.error?.code;
    const hint = code === 190 ? "Token inválido ou expirado. Gere um novo token em Gerenciador de Eventos → Configurações → API de Conversões."
      : code === 200 || code === 10 ? "O token não tem acesso a este Pixel. Gere o token no próprio Gerenciador de Eventos do Pixel (mesma conta/negócio)."
      : code === 80004 ? "Seu acesso à Meta está com limite temporário. Aguarde alguns minutos."
      : undefined;
    return Response.json({ error: `A Meta recusou o Pixel ID ou o token (erro ${code}: ${detail.error?.message || "sem detalhes"}${hint ? " — " + hint : ""})` }, { status: 400 });
  }
  const encrypted = await encryptSecret(body.accessToken.trim());
  await getDb().update(projects).set({ pixelId: body.pixelId, metaTokenCipher: encrypted.cipher, metaTokenIv: encrypted.iv, metaTestCode: body.testCode?.trim() || null, metaConnectedAt: new Date().toISOString() }).where(eq(projects.id, body.projectId));
  return Response.json({ connected: true, pixelId: body.pixelId });
}

export async function DELETE(request:Request){
  await ensureDb();const userId=await requestUserId(request);if(!userId)return Response.json({error:"Não autenticado"},{status:401});const projectId=new URL(request.url).searchParams.get("projectId");if(!projectId)return Response.json({error:"Projeto não informado"},{status:400});const workspaceId="ws_"+(await sha256(userId)).slice(0,24),[owned]=await getDb().select({id:projects.id}).from(projects).where(and(eq(projects.id,projectId),eq(projects.workspaceId,workspaceId))).limit(1);if(!owned)return Response.json({error:"Projeto não encontrado"},{status:404});await getDb().update(projects).set({pixelId:null,metaTokenCipher:null,metaTokenIv:null,metaTestCode:null,metaConnectedAt:null}).where(eq(projects.id,projectId));return Response.json({disconnected:true,projectId});
}
