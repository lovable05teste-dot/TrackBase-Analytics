import { and, eq } from "drizzle-orm";
import { ensureDb, getDb } from "../../../db";
import { apiCredentials, projects } from "../../../db/schema";
import { requestUserId, sha256 } from "../../../lib/trackbase-security";

export async function GET(request: Request) {
  await ensureDb();
  const userId = await requestUserId(request);
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const workspaceId = "ws_" + (await sha256(userId)).slice(0, 24);
  const rows = await getDb().select({ id: apiCredentials.id, name: apiCredentials.name, provider: apiCredentials.provider, projectId: apiCredentials.projectId, active: apiCredentials.active, createdAt: apiCredentials.createdAt, lastUsedAt: apiCredentials.lastUsedAt }).from(apiCredentials).where(eq(apiCredentials.workspaceId, workspaceId));
  return Response.json({ credentials: rows.map(r=>({...r,active:r.active===1||(r.active as unknown)===true})) });
}

export async function POST(request: Request) {
  await ensureDb();
  const userId = await requestUserId(request);
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const body = await request.json() as { projectId?: string; name?: string; provider?: string };
  if (!body.projectId || !body.name?.trim()) return Response.json({ error: "Projeto e nome são obrigatórios" }, { status: 400 });
  const workspaceId = "ws_" + (await sha256(userId)).slice(0, 24);
  const [project] = await getDb().select({ id: projects.id }).from(projects).where(and(eq(projects.id, body.projectId), eq(projects.workspaceId, workspaceId))).limit(1);
  if (!project) return Response.json({ error: "Projeto não encontrado" }, { status: 404 });
  const id = crypto.randomUUID();
  const token = "tb_live_" + crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
  await getDb().insert(apiCredentials).values({ id, workspaceId, projectId: body.projectId, name: body.name.trim(), provider: body.provider?.trim().toLowerCase() || "generic", tokenHash: await sha256(token), createdAt: new Date().toISOString() });
  const origin = new URL(request.url).origin;
  return Response.json({ credential: { id, name: body.name.trim(), token, webhookUrl: `${origin}/api/webhooks/gateway`, webhookUrlWithToken:`${origin}/api/webhooks/gateway?token=${encodeURIComponent(token)}`,authorization: `Bearer ${token}` } }, { status: 201 });
}

export async function DELETE(request:Request){
  await ensureDb();const userId=await requestUserId(request);if(!userId)return Response.json({error:"Não autenticado"},{status:401});
  const id=new URL(request.url).searchParams.get("id");if(!id)return Response.json({error:"Credencial não informada"},{status:400});
  const workspaceId="ws_"+(await sha256(userId)).slice(0,24),db=getDb(),[credential]=await db.select({id:apiCredentials.id}).from(apiCredentials).where(and(eq(apiCredentials.id,id),eq(apiCredentials.workspaceId,workspaceId))).limit(1);
  if(!credential)return Response.json({error:"Credencial não encontrada"},{status:404});await db.delete(apiCredentials).where(and(eq(apiCredentials.id,id),eq(apiCredentials.workspaceId,workspaceId)));return Response.json({deleted:true,id});
}
