import { and, desc, eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { offers } from "@/db/schema";
import { requestUserId, sha256 } from "@/lib/trackbase-security";

export const dynamic = "force-dynamic";

async function workspaceOf(request: Request) {
  const userId = await requestUserId(request);
  if (!userId) return null;
  return "ws_" + (await sha256(userId)).slice(0, 24);
}

export async function GET(request: Request) {
  const workspaceId = await workspaceOf(request);
  if (!workspaceId) return Response.json({ error: "Não autenticado." }, { status: 401 });
  await ensureDb();
  const rows = await getDb().select().from(offers).where(eq(offers.workspaceId, workspaceId)).orderBy(desc(offers.createdAt));
  return Response.json({ offers: rows });
}

export async function POST(request: Request) {
  const workspaceId = await workspaceOf(request);
  if (!workspaceId) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { name?: unknown; price?: unknown; hook?: unknown };
  const name = String(body.name || "").trim().slice(0, 120);
  if (!name) return Response.json({ error: "Dê um nome para a oferta." }, { status: 400 });
  await ensureDb();
  const now = Math.floor(Date.now() / 1000);
  const row = { id: crypto.randomUUID(), workspaceId, name, price: Math.max(0, Number(body.price) || 0), hook: String(body.hook || "").slice(0, 240) || null, status: "em teste", createdAt: now, updatedAt: now };
  await getDb().insert(offers).values(row);
  return Response.json({ ok: true, offer: row }, { status: 201 });
}

export async function PUT(request: Request) {
  const workspaceId = await workspaceOf(request);
  if (!workspaceId) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { id?: unknown; status?: unknown };
  const id = String(body.id || "");
  const status = String(body.status || "");
  if (!id || !["em teste", "vencedora", "pausada"].includes(status)) return Response.json({ error: "Dados inválidos." }, { status: 400 });
  await ensureDb();
  await getDb().update(offers).set({ status, updatedAt: Math.floor(Date.now() / 1000) }).where(and(eq(offers.id, id), eq(offers.workspaceId, workspaceId)));
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const workspaceId = await workspaceOf(request);
  if (!workspaceId) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return Response.json({ error: "ID ausente." }, { status: 400 });
  await ensureDb();
  await getDb().delete(offers).where(and(eq(offers.id, id), eq(offers.workspaceId, workspaceId)));
  return Response.json({ ok: true });
}
