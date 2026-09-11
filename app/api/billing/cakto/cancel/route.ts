import { eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { planSubscriptions } from "@/db/schema";
import { requestUserId, sha256 } from "@/lib/trackbase-security";
import { CaktoError, cancelSubscription } from "@/lib/cakto";

export async function POST(request: Request) {
  await ensureDb();
  const userId = await requestUserId(request);
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const workspaceId = "ws_" + (await sha256(userId)).slice(0, 24);
  const db = getDb();
  const rows = await db.select().from(planSubscriptions).where(eq(planSubscriptions.workspaceId, workspaceId));
  const current = rows.find((r) => r.status === "active" || r.status === "past_due") || rows[0];
  if (!current) return Response.json({ error: "Nenhuma assinatura encontrada." }, { status: 404 });
  const now = Math.floor(Date.now() / 1000);
  try {
    if (current.caktoSubscriptionId) await cancelSubscription(current.caktoSubscriptionId);
  } catch (e) {
    if (!(e instanceof CaktoError && e.status === 400)) {
      return Response.json({ error: "Não foi possível cancelar na Cakto. Tente de novo." }, { status: 502 });
    }
  }
  await db.update(planSubscriptions).set({ status: "canceled", updatedAt: now }).where(eq(planSubscriptions.id, current.id));
  return Response.json({ ok: true, status: "canceled" });
}
