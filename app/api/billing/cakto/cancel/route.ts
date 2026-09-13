import { eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { planSubscriptions } from "@/db/schema";
import { requestUserId, sha256 } from "@/lib/trackbase-security";
import { CaktoError, cancelSubscription } from "@/lib/cakto";
import { audit } from "@/lib/permissions";
import { emailCanceled } from "@/lib/emails";
import { getEffectivePlan, type PlanId } from "@/lib/plans";

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
  const body = (await request.json().catch(() => ({}))) as { atPeriodEnd?: unknown };
  const atPeriodEnd = body.atPeriodEnd !== false; // padrão: fim do ciclo
  try {
    if (current.caktoSubscriptionId) await cancelSubscription(current.caktoSubscriptionId);
  } catch (e) {
    if (!(e instanceof CaktoError && e.status === 400)) return Response.json({ error: "Não foi possível cancelar na Cakto. Tente de novo." }, { status: 502 });
  }
  if (atPeriodEnd && (current as { currentPeriodEnd?: number | null }).currentPeriodEnd) {
    await db.update(planSubscriptions).set({ cancelAtPeriodEnd: 1, updatedAt: now } as never).where(eq(planSubscriptions.id, current.id));
    const p = getEffectivePlan(current.plan as PlanId, (current as { planVersion?: number | null }).planVersion);
    const until = (current as { currentPeriodEnd?: number | null }).currentPeriodEnd ? new Date((current as { currentPeriodEnd: number }).currentPeriodEnd * 1000).toLocaleDateString("pt-BR") : "fim do período pago";
    try { if ((current as { email?: string | null }).email) await emailCanceled((current as { email: string }).email, p.name, until); } catch {}
    await audit(workspaceId, userId, "subscription:cancel_scheduled", "plan", current.plan, `até ${until}`, request.headers.get("x-forwarded-for"));
    return Response.json({ ok: true, status: "canceled_scheduled", until });
  }
  await db.update(planSubscriptions).set({ status: "canceled", updatedAt: now }).where(eq(planSubscriptions.id, current.id));
  await audit(workspaceId, userId, "subscription:canceled", "plan", current.plan, "imediato", request.headers.get("x-forwarded-for"));
  return Response.json({ ok: true, status: "canceled" });
}
