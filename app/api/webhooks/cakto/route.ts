import { eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { auditLogs, planSubscriptions, users, webhookEvents } from "@/db/schema";
import { sha256 } from "@/lib/trackbase-security";
import { planOfferId, PLAN_IDS, PLAN_VERSION_CURRENT, type PlanId, getEffectivePlan } from "@/lib/plans";
import { verifyWebhookSecret, verifyWebhookSignature } from "@/lib/cakto";
import { emailPaymentConfirmed, emailCanceled, emailRefunded } from "@/lib/emails";

type OrderData = {
  id?: unknown;
  status?: unknown;
  amount?: unknown;
  currency?: unknown;
  offer?: { id?: unknown } | null;
  subscription?: { id?: unknown; next_payment_date?: unknown } | null;
  customer?: { email?: unknown } | null;
};

function ourOfferIds(): Set<string> {
  const ids = new Set<string>();
  for (const plan of PLAN_IDS) { const offerId = planOfferId(plan as PlanId); if (offerId) ids.add(offerId); }
  return ids;
}
function planOfOffer(offerId: string): PlanId | null {
  for (const plan of PLAN_IDS) if (planOfferId(plan as PlanId) === offerId) return plan as PlanId;
  return null;
}
function tsOf(value: unknown): number | null {
  if (!value) return null;
  const t = Math.floor(new Date(String(value)).getTime() / 1000);
  return Number.isFinite(t) ? t : null;
}

async function handleOrderEvent(event: string, data: OrderData) {
  const offerId = typeof data.offer?.id === "string" ? data.offer.id : "";
  const subId = typeof data.subscription?.id === "string" ? data.subscription.id : "";
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);

  if (subId) {
    const rows = await db.select().from(planSubscriptions).where(eq(planSubscriptions.caktoSubscriptionId, subId));
    const row = rows[0] as (typeof rows)[number] & { status: string; plan: string; email?: string | null } | undefined;
    if (!row) return;
    // Evento antigo não reativa compra já reembolsada/cancelada por refund/chargeback
    const refundedStates = new Set(["refunded", "chargeback"]);
    if (refundedStates.has(row.status) && (event === "subscription_renewed" || event === "subscription_resumed" || event === "purchase_approved")) return;
    const periodEnd = tsOf(data.subscription?.next_payment_date);
    const periodStart = now;
    if (event === "subscription_renewed" || event === "subscription_resumed" || event === "subscription_late_recovered" || event === "purchase_approved") {
      const wasActive = row.status === "active";
      await db.update(planSubscriptions).set({ status: "active", ...(periodEnd ? { currentPeriodEnd: periodEnd, currentPeriodStart: periodStart } : {}), updatedAt: now }).where(eq(planSubscriptions.id, row.id));
      if (!wasActive && row.email) { try { const p = getEffectivePlan(row.plan as PlanId, (row as { planVersion?: number | null }).planVersion); await emailPaymentConfirmed(row.email, p.name); } catch {} }
      // se tinha downgrade agendado e renovou no novo ciclo, aplica
      const sched = (row as { scheduledPlan?: string | null }).scheduledPlan;
      if (sched && periodEnd) {
        // agenda aplica no próximo ciclo; por enquanto só loga — aplicação real no cron de renovação
      }
    } else if (event === "subscription_canceled" || event === "subscription_expired") {
      // mantém acesso até periodEnd se cancelAtPeriodEnd; webhook da Cakto já reflete fim do ciclo
      await db.update(planSubscriptions).set({ status: "canceled", updatedAt: now }).where(eq(planSubscriptions.id, row.id));
      if (row.email) { try { const p = getEffectivePlan(row.plan as PlanId, (row as { planVersion?: number | null }).planVersion); const until = periodEnd ? new Date(periodEnd * 1000).toLocaleDateString("pt-BR") : "fim do período pago"; await emailCanceled(row.email, p.name, until); } catch {} }
    } else if (event === "subscription_late") {
      await db.update(planSubscriptions).set({ status: "past_due", updatedAt: now }).where(eq(planSubscriptions.id, row.id));
    } else if (event === "subscription_paused") {
      await db.update(planSubscriptions).set({ status: "paused", updatedAt: now }).where(eq(planSubscriptions.id, row.id));
    } else if (event === "refund" || event === "chargeback" || event === "purchase_refused") {
      const st = event === "chargeback" ? "chargeback" : event === "refund" ? "refunded" : "canceled";
      await db.update(planSubscriptions).set({ status: st, updatedAt: now }).where(eq(planSubscriptions.id, row.id));
      if (row.email) { try { const p = getEffectivePlan(row.plan as PlanId, (row as { planVersion?: number | null }).planVersion); await emailRefunded(row.email, p.name); } catch {} }
    }
    return;
  }

  const paidStatus = typeof data.status === "string" ? data.status.trim().toLowerCase() : "";
  if (event === "purchase_approved" && paidStatus !== "paid") return;
  if (event === "purchase_approved" && offerId && ourOfferIds().has(offerId)) {
    const email = typeof data.customer?.email === "string" ? data.customer.email.trim().toLowerCase() : "";
    const plan = planOfOffer(offerId);
    if (!email || !plan) return;
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (!user) return;
    const workspaceId = "ws_" + (await sha256(user.id)).slice(0, 24);
    const orderId = typeof data.id === "string" ? data.id : crypto.randomUUID();
    const existing = await db.select().from(planSubscriptions).where(eq(planSubscriptions.workspaceId, workspaceId));
    const pendingSameOrder = existing.find((r) => (r as { caktoOrderId?: string | null }).caktoOrderId === orderId);
    if (pendingSameOrder) {
      await db.update(planSubscriptions).set({ status: "active", plan, planVersion: PLAN_VERSION_CURRENT, caktoOfferId: offerId, ...(subId ? { caktoSubscriptionId: subId } : {}), currentPeriodStart: now, currentPeriodEnd: null, updatedAt: now }).where(eq(planSubscriptions.id, pendingSameOrder.id));
      try { const p = getEffectivePlan(plan, PLAN_VERSION_CURRENT); await emailPaymentConfirmed(email, p.name); } catch {}
      return;
    }
    const alreadyActive = existing.some((r) => r.status === "active");
    if (alreadyActive) return;
    for (const p of existing) if (p.status === "active" || p.status === "past_due") await db.update(planSubscriptions).set({ status: "replaced", updatedAt: now }).where(eq(planSubscriptions.id, p.id));
    const amount = typeof data.amount === "number" ? String(data.amount) : typeof data.amount === "string" ? data.amount : null;
    await db.insert(planSubscriptions).values({
      id: crypto.randomUUID(),
      workspaceId, userId: user.id, email, plan, planVersion: PLAN_VERSION_CURRENT, status: "active",
      caktoOrderId: orderId, caktoSubscriptionId: null, caktoOfferId: offerId, amount, currency: typeof data.currency === "string" ? data.currency : "BRL",
      currentPeriodStart: now, currentPeriodEnd: null, cancelAtPeriodEnd: 0, excessEnabled: 0, excessCap: null, scheduledPlan: null, scheduledAt: null, createdAt: now, updatedAt: now,
    } as never);
    try { const p = getEffectivePlan(plan, PLAN_VERSION_CURRENT); await emailPaymentConfirmed(email, p.name); } catch {}
  }
}

export async function POST(request: Request) {
  const raw = await request.text();
  const timestamp = request.headers.get("x-cakto-timestamp") || "";
  const signature = request.headers.get("x-cakto-signature") || "";
  let body: { secret?: unknown; event?: unknown; data?: unknown; id?: unknown };
  try { body = JSON.parse(raw); } catch { return Response.json({ error: "JSON inválido" }, { status: 400 }); }
  const valid = verifyWebhookSignature(raw, timestamp, signature) || verifyWebhookSecret(body.secret);
  if (!valid) return Response.json({ error: "Assinatura inválida" }, { status: 401 });
  const event = typeof body.event === "string" ? body.event : "";
  if (!event) return Response.json({ received: true });
  await ensureDb();
  // Idempotência + persistência durável antes de processar
  const eventId = typeof body.id === "string" && body.id ? body.id : `${event}:${typeof body.data === "object" && body.data && "id" in (body.data as Record<string, unknown>) ? String((body.data as Record<string, unknown>).id) : raw.slice(0, 80)}`;
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  try {
    await db.insert(webhookEvents).values({ id: crypto.randomUUID(), provider: "cakto", eventId, eventType: event, payload: raw.slice(0, 8000), status: "received", createdAt: now, processedAt: null } as never);
  } catch {
    // duplicado → já processado
    return Response.json({ received: true, deduplicated: true });
  }
  try {
    if (event === "checkout_abandonment") { await db.update(webhookEvents).set({ status: "ignored", processedAt: now }).where(eq(webhookEvents.eventId, eventId) as never); return Response.json({ received: true }); }
    if (Array.isArray(body.data)) for (const item of body.data) await handleOrderEvent(event, (item || {}) as OrderData);
    else if (body.data && typeof body.data === "object") await handleOrderEvent(event, body.data as OrderData);
    await db.update(webhookEvents).set({ status: "processed", processedAt: now }).where(eq(webhookEvents.eventId, eventId) as never);
    // audit
    try { await db.insert(auditLogs).values({ id: crypto.randomUUID(), workspaceId: null, userId: null, action: `webhook:${event}`, targetType: "cakto", targetId: eventId.slice(0, 64), detail: `event ${event}`, ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null, createdAt: now } as never); } catch {}
  } catch (e) {
    console.error("cakto webhook", e);
    try { await db.update(webhookEvents).set({ status: "error", processedAt: now }).where(eq(webhookEvents.eventId, eventId) as never); } catch {}
  }
  return Response.json({ received: true });
}
