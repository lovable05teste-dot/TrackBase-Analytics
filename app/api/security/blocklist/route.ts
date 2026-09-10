import { and, eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { blockedIps } from "@/db/schema";
import { normalizeIp } from "@/lib/fraud";
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
  const rows = await getDb().select().from(blockedIps).where(eq(blockedIps.workspaceId, workspaceId));
  return Response.json({ ips: rows });
}

export async function POST(request: Request) {
  const workspaceId = await workspaceOf(request);
  if (!workspaceId) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { ip?: unknown; reason?: unknown };
  const raw = String(body.ip || "").trim();
  if (!raw || raw.length > 64) return Response.json({ error: "IP inválido." }, { status: 400 });
  const ip = normalizeIp(raw);
  await ensureDb();
  const row = { id: crypto.randomUUID(), workspaceId, ip, reason: String(body.reason || "").slice(0, 140) || null, createdAt: Math.floor(Date.now() / 1000) };
  await getDb().insert(blockedIps).values(row).onConflictDoNothing();
  return Response.json({ ok: true, ip: row });
}

export async function DELETE(request: Request) {
  const workspaceId = await workspaceOf(request);
  if (!workspaceId) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return Response.json({ error: "ID ausente." }, { status: 400 });
  await ensureDb();
  await getDb().delete(blockedIps).where(and(eq(blockedIps.id, id), eq(blockedIps.workspaceId, workspaceId)));
  return Response.json({ ok: true });
}
