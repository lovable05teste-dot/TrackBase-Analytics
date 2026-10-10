import { and, eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { tiktokAccounts } from "@/db/schema";
import { requireFeature } from "@/lib/permissions";
import { tiktokConfig } from "@/lib/tiktok";
import { requestUserId } from "@/lib/trackbase-security";

export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

async function list(userId: string) {
  const rows = await getDb().select().from(tiktokAccounts).where(eq(tiktokAccounts.userId, userId));
  return rows.sort((a, b) => a.advertiserName.localeCompare(b.advertiserName)).map((r) => ({ advertiserId: r.advertiserId, name: r.advertiserName, currency: r.currency, timezone: r.timezone, selected: Boolean(r.selected) }));
}

export async function GET(request: Request) {
  const userId = await requestUserId(request);
  if (!userId) return json({ error: "Não autenticado" }, 401);
  await ensureDb();
  return json({ configured: tiktokConfig().configured, accounts: await list(userId) });
}

// Vincula/desvincula uma conta de anúncios (entra nas Campanhas TikTok).
export async function POST(request: Request) {
  const userId = await requestUserId(request);
  if (!userId) return json({ error: "Não autenticado" }, 401);
  if (!(await requireFeature(userId, "ativador_tiktok"))) return json({ error: "Seu plano precisa estar ativo para vincular contas.", upgrade: "/planos" }, 402);
  await ensureDb();
  const body = (await request.json().catch(() => ({}))) as { advertiserId?: unknown; enabled?: unknown };
  const advertiserId = String(body.advertiserId || "");
  const updated = await getDb().update(tiktokAccounts).set({ selected: body.enabled ? 1 : 0, updatedAt: Math.floor(Date.now() / 1000) }).where(and(eq(tiktokAccounts.userId, userId), eq(tiktokAccounts.advertiserId, advertiserId))).returning({ id: tiktokAccounts.id });
  if (!updated.length) return json({ error: "Conta não encontrada." }, 404);
  return json({ accounts: await list(userId) });
}

// Remove uma conta (ou todas, sem advertiserId) da GhostScale.
export async function DELETE(request: Request) {
  const userId = await requestUserId(request);
  if (!userId) return json({ error: "Não autenticado" }, 401);
  await ensureDb();
  const advertiserId = new URL(request.url).searchParams.get("advertiserId");
  await getDb().delete(tiktokAccounts).where(advertiserId ? and(eq(tiktokAccounts.userId, userId), eq(tiktokAccounts.advertiserId, advertiserId)) : eq(tiktokAccounts.userId, userId));
  return json({ accounts: await list(userId) });
}
