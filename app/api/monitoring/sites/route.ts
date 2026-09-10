import { and, eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { monitoredSites } from "@/db/schema";
import { normalizeUrl, probeSite } from "@/lib/monitoring";
import { requestUserId, sha256 } from "@/lib/trackbase-security";

async function workspaceOf(request: Request) {
  const userId = await requestUserId(request);
  if (!userId) return null;
  return "ws_" + (await sha256(userId)).slice(0, 24);
}

export async function GET(request: Request) {
  const workspaceId = await workspaceOf(request);
  if (!workspaceId) return Response.json({ error: "Não autenticado." }, { status: 401 });
  await ensureDb();
  const rows = await getDb().select().from(monitoredSites).where(eq(monitoredSites.workspaceId, workspaceId));
  return Response.json({ sites: rows });
}

export async function POST(request: Request) {
  const workspaceId = await workspaceOf(request);
  if (!workspaceId) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { url?: unknown };
  const url = normalizeUrl(String(body.url || ""));
  if (!url) return Response.json({ error: "URL inválida." }, { status: 400 });
  await ensureDb();
  const now = Math.floor(Date.now() / 1000);
  const probe = await probeSite(url);
  const row = {
    id: crypto.randomUUID(),
    workspaceId,
    url,
    active: 1,
    lastStatus: probe.status,
    lastMs: probe.ms,
    lastCode: probe.code,
    lastCheckedAt: now,
    consecutiveFailures: probe.status === "falha" ? 1 : 0,
    createdAt: now,
  };
  await getDb().insert(monitoredSites).values(row);
  return Response.json({ ok: true, site: row });
}

export async function DELETE(request: Request) {
  const workspaceId = await workspaceOf(request);
  if (!workspaceId) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return Response.json({ error: "ID ausente." }, { status: 400 });
  await ensureDb();
  const [own] = await getDb().select({ id: monitoredSites.id }).from(monitoredSites).where(and(eq(monitoredSites.id, id), eq(monitoredSites.workspaceId, workspaceId))).limit(1);
  if (!own) return Response.json({ error: "Site não encontrado." }, { status: 404 });
  await getDb().delete(monitoredSites).where(eq(monitoredSites.id, id));
  return Response.json({ ok: true });
}
