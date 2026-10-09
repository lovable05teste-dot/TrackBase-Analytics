import { and, desc, eq, inArray } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { capiOutbox, projects } from "@/db/schema";
import { hasConflictingOrigin, requestUserId, sha256 } from "@/lib/trackbase-security";
import { drainCapiOutbox } from "@/lib/sale-ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const userId = await requestUserId(request);
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });
  await ensureDb();
  const workspaceId = "ws_" + (await sha256(userId)).slice(0, 24);
  const rows = await getDb().select({ id: capiOutbox.id, eventId: capiOutbox.eventId,
    project: projects.name, status: capiOutbox.status, attempts: capiOutbox.attempts,
    error: capiOutbox.lastError, updatedAt: capiOutbox.updatedAt })
    .from(capiOutbox).innerJoin(projects, eq(projects.id, capiOutbox.projectId))
    .where(and(eq(capiOutbox.workspaceId, workspaceId), eq(projects.workspaceId, workspaceId), eq(capiOutbox.eventName, "Purchase")))
    .orderBy(desc(capiOutbox.createdAt)).limit(50);
  return Response.json({ deliveries: rows }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (hasConflictingOrigin(request)) return Response.json({ error: "Origem inválida" }, { status: 403 });
  const userId = await requestUserId(request);
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: unknown } | null;
  if (typeof body?.id !== "string") return Response.json({ error: "Informe o envio" }, { status: 400 });
  await ensureDb();
  const db = getDb(), workspaceId = "ws_" + (await sha256(userId)).slice(0, 24);
  const [row] = await db.select().from(capiOutbox)
    .where(and(eq(capiOutbox.id, body.id), eq(capiOutbox.workspaceId, workspaceId))).limit(1);
  if (!row) return Response.json({ error: "Envio não encontrado" }, { status: 404 });
  if (row.status === "sent" || row.status === "processing") return Response.json({ status: row.status });
  const now = Math.floor(Date.now() / 1000);
  await db.update(capiOutbox).set({ status: "pending", attempts: 0, nextAttemptAt: now, updatedAt: now })
    .where(and(eq(capiOutbox.id, row.id), eq(capiOutbox.workspaceId, workspaceId), inArray(capiOutbox.status, ["pending", "dead"])));
  await drainCapiOutbox(db, { workspaceId, id: row.id, limit: 1 });
  const [updated] = await db.select({ status: capiOutbox.status, error: capiOutbox.lastError }).from(capiOutbox).where(eq(capiOutbox.id, row.id)).limit(1);
  return Response.json(updated);
}
