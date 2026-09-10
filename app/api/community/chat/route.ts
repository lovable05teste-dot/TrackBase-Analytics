import { desc } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { communityMessages } from "@/db/schema";
import { requestUserId } from "@/lib/trackbase-security";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureDb();
  const rows = await getDb().select().from(communityMessages).orderBy(desc(communityMessages.createdAt)).limit(100);
  return Response.json({ msgs: [...rows].reverse() });
}

export async function POST(request: Request) {
  const userId = await requestUserId(request);
  if (!userId) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { name?: unknown; text?: unknown };
  const name = String(body.name || "Anônimo").trim().slice(0, 40) || "Anônimo";
  const text = String(body.text || "").trim().slice(0, 500);
  if (!text) return Response.json({ error: "Mensagem vazia." }, { status: 400 });
  await ensureDb();
  const row = { id: crypto.randomUUID(), name, text, createdAt: Math.floor(Date.now() / 1000) };
  await getDb().insert(communityMessages).values(row);
  return Response.json({ ok: true, msg: row }, { status: 201 });
}
