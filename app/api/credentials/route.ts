import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { apiCredentials, projects } from "../../../db/schema";
import { requestUserId, sha256 } from "../../../lib/trackbase-security";

export async function GET(request: Request) {
  const userId = await requestUserId(request);
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const workspaceId = "ws_" + (await sha256(userId)).slice(0, 24);
  const rows = await getDb().select({ id: apiCredentials.id, name: apiCredentials.name, provider: apiCredentials.provider, projectId: apiCredentials.projectId, active: apiCredentials.active, createdAt: apiCredentials.createdAt, lastUsedAt: apiCredentials.lastUsedAt }).from(apiCredentials).where(eq(apiCredentials.workspaceId, workspaceId));
  return Response.json({ credentials: rows });
}

export async function POST(request: Request) {
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
  return Response.json({ credential: { id, name: body.name.trim(), token, webhookUrl: `${origin}/api/webhooks/gateway`, authorization: `Bearer ${token}` } }, { status: 201 });
}
