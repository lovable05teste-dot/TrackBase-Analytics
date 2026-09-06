import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { members, projects, workspaces } from "../../../db/schema";
import { requestUserId, sha256 } from "../../../lib/trackbase-security";

export async function GET(request: Request) {
  const userId = await requestUserId(request);
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const workspaceId = "ws_" + (await sha256(userId)).slice(0, 24);
  const rows = await getDb().select({
    id: projects.id, name: projects.name, domain: projects.domain,
    publicKey: projects.publicKey, pixelId: projects.pixelId,
    metaConnectedAt: projects.metaConnectedAt
  }).from(projects).where(eq(projects.workspaceId, workspaceId));
  return Response.json({ projects: rows });
}

export async function POST(request: Request) {
  const userId = await requestUserId(request);
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const body = await request.json() as { name?: string; domain?: string };
  if (!body.name?.trim()) return Response.json({ error: "Informe o nome do projeto" }, { status: 400 });
  const workspaceId = "ws_" + (await sha256(userId)).slice(0, 24);
  const projectId = crypto.randomUUID();
  const publicKey = crypto.randomUUID().replaceAll("-", "");
  const webhookSecret = "tbwh_" + crypto.randomUUID().replaceAll("-", "");
  const now = new Date().toISOString();
  const db = getDb();
  await db.batch([
    db.insert(workspaces).values({ id: workspaceId, name: "Meu workspace", createdAt: now }).onConflictDoNothing(),
    db.insert(members).values({ id: crypto.randomUUID(), workspaceId, userId, role: "owner" }).onConflictDoNothing(),
    db.insert(projects).values({ id: projectId, workspaceId, name: body.name.trim(), domain: body.domain?.trim() || null, publicKey, webhookSecretHash: await sha256(webhookSecret), createdAt: now })
  ]);
  const origin = new URL(request.url).origin;
  return Response.json({ project: { id: projectId, name: body.name.trim(), publicKey }, webhookSecret, script: `<script async src="${origin}/tracker.js?key=${publicKey}"></script>` }, { status: 201 });
}
