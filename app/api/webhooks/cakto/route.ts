import { eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { planSubscriptions, users } from "@/db/schema";
import { sha256 } from "@/lib/trackbase-security";
import { planOfferId, PLAN_IDS, type PlanId } from "@/lib/cakto-plans";
import { verifyWebhookSecret, verifyWebhookSignature } from "@/lib/cakto";

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
  for (const plan of PLAN_IDS) {
    const offerId = planOfferId(plan as PlanId);
    if (offerId) ids.add(offerId);
  }
  return ids;
}

function planOfOffer(offerId: string): PlanId | null {
  for (const plan of PLAN_IDS) {
    if (planOfferId(plan as PlanId) === offerId) return plan as PlanId;
  }
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
    const row = rows[0];
    if (!row) return;
    const periodEnd = tsOf(data.subscription?.next_payment_date);
    if (event === "subscription_renewed" || event === "subscription_resumed" || event === "subscription_late_recovered" || event === "purchase_approved") {
      await db
        .update(planSubscriptions)
        .set({ status: "active", ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}), updatedAt: now })
        .where(eq(planSubscriptions.id, row.id));
    } else if (event === "subscription_canceled" || event === "subscription_expired") {
      await db.update(planSubscriptions).set({ status: "canceled", updatedAt: now }).where(eq(planSubscriptions.id, row.id));
    } else if (event === "subscription_late") {
      await db.update(planSubscriptions).set({ status: "past_due", updatedAt: now }).where(eq(planSubscriptions.id, row.id));
    } else if (event === "subscription_paused") {
      await db.update(planSubscriptions).set({ status: "paused", updatedAt: now }).where(eq(planSubscriptions.id, row.id));
    } else if (event === "refund" || event === "chargeback") {
      await db.update(planSubscriptions).set({ status: "canceled", updatedAt: now }).where(eq(planSubscriptions.id, row.id));
    }
    return;
  }

  if (event === "purchase_approved" && offerId && ourOfferIds().has(offerId)) {
    const email = typeof data.customer?.email === "string" ? data.customer.email.trim().toLowerCase() : "";
    const plan = planOfOffer(offerId);
    if (!email || !plan) return;
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (!user) return;
    const workspaceId = "ws_" + (await sha256(user.id)).slice(0, 24);
    const orderId = typeof data.id === "string" ? data.id : crypto.randomUUID();
    const existing = await db.select().from(planSubscriptions).where(eq(planSubscriptions.workspaceId, workspaceId));
    const pendingSameOrder = existing.find((r) => r.caktoOrderId === orderId);
    if (pendingSameOrder) {
      // Pix Automático aprovado: pendente (past_due) vira ativa
      await db
        .update(planSubscriptions)
        .set({
          status: "active",
          plan,
          caktoOfferId: offerId,
          ...(subId ? { caktoSubscriptionId: subId } : {}),
          updatedAt: now,
        })
        .where(eq(planSubscriptions.id, pendingSameOrder.id));
      return;
    }
    const alreadyActive = existing.some((r) => r.status === "active");
    if (alreadyActive) return;
    for (const p of existing) {
      if (p.status === "active" || p.status === "past_due")
        await db.update(planSubscriptions).set({ status: "replaced", updatedAt: now }).where(eq(planSubscriptions.id, p.id));
    }
    const amount = typeof data.amount === "number" ? String(data.amount) : typeof data.amount === "string" ? data.amount : null;
    await db.insert(planSubscriptions).values({
      id: crypto.randomUUID(),
      workspaceId,
      userId: user.id,
      email,
      plan,
      status: "active",
      caktoOrderId: orderId,
      caktoSubscriptionId: null,
      caktoOfferId: offerId,
      amount,
      currency: typeof data.currency === "string" ? data.currency : "BRL",
      currentPeriodEnd: null,
      createdAt: now,
      updatedAt: now,
    });
  }
}

export async function POST(request: Request) {
  const raw = await request.text();
  const timestamp = request.headers.get("x-cakto-timestamp") || "";
  const signature = request.headers.get("x-cakto-signature") || "";
  let body: { secret?: unknown; event?: unknown; data?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  const valid = verifyWebhookSignature(raw, timestamp, signature) || verifyWebhookSecret(body.secret);
  if (!valid) return Response.json({ error: "Assinatura inválida" }, { status: 401 });
  const event = typeof body.event === "string" ? body.event : "";
  if (!event) return Response.json({ received: true });
  await ensureDb();
  try {
    if (event === "checkout_abandonment") return Response.json({ received: true });
    if (Array.isArray(body.data)) {
      for (const item of body.data) await handleOrderEvent(event, (item || {}) as OrderData);
    } else if (body.data && typeof body.data === "object") {
      await handleOrderEvent(event, body.data as OrderData);
    }
  } catch (e) {
    console.error("cakto webhook", e);
  }
  return Response.json({ received: true });
}
