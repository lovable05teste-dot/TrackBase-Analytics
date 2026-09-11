import { eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { planSubscriptions } from "@/db/schema";
import { requestUserId, sha256 } from "@/lib/trackbase-security";
import { CaktoError, createCardCharge, createSubscription } from "@/lib/cakto";
import { isPlanId, planOfferId, PLANS } from "@/lib/cakto-plans";

function friendlyCakto(e: CaktoError): string {
  const body = e.body as Record<string, unknown>;
  const first = (v: unknown) => (Array.isArray(v) ? String(v[0]) : typeof v === "string" ? v : "");
  if (e.status === 401) return "Falha de autenticação com a Cakto. Fale com o suporte.";
  if (e.status === 429) return "Muitas tentativas. Aguarde 1 minuto e tente de novo.";
  if (typeof body?.detail === "string" && body.detail) return body.detail;
  for (const key of ["items", "card", "customer", "antifraud_profiling_attempt_reference"]) {
    const msg = first((body as Record<string, unknown>)[key]);
    if (msg) return msg;
  }
  return "A operadora recusou a cobrança. Confira os dados do cartão.";
}

export async function POST(request: Request) {
  await ensureDb();
  const userId = await requestUserId(request);
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as {
    plan?: unknown;
    cardToken?: unknown;
    antifraudReference?: unknown;
    installments?: unknown;
    customer?: { name?: unknown; email?: unknown; phone?: unknown; docType?: unknown; docNumber?: unknown };
  };
  if (!isPlanId(body.plan)) return Response.json({ error: "Plano inválido." }, { status: 400 });
  const offerId = planOfferId(body.plan);
  if (!offerId) return Response.json({ error: `Cobrança do plano ${PLANS[body.plan].name} ainda não configurada. Fale com o suporte.` }, { status: 500 });
  const cardToken = typeof body.cardToken === "string" ? body.cardToken.trim() : "";
  const antifraudReference = typeof body.antifraudReference === "string" ? body.antifraudReference.trim() : "";
  if (!cardToken || !antifraudReference)
    return Response.json({ error: "Dados do cartão incompletos. Preencha novamente." }, { status: 400 });
  const c = body.customer || {};
  const name = typeof c.name === "string" ? c.name.trim() : "";
  const email = typeof c.email === "string" ? c.email.trim().toLowerCase() : "";
  const phone = typeof c.phone === "string" ? c.phone.replace(/\D/g, "") : "";
  const docNumber = typeof c.docNumber === "string" ? c.docNumber.replace(/\D/g, "") : "";
  const docType = c.docType === "cnpj" ? "cnpj" : "cpf";
  if (name.length < 3 || !/.+@.+\..+/.test(email) || phone.length < 12)
    return Response.json({ error: "Confira nome, e-mail e telefone com DDD." }, { status: 400 });
  try {
    const charge = await createCardCharge({
      plan: body.plan,
      customer: {
        name,
        email,
        phone,
        fingerprint: `ghostscale-${userId}`,
        docType,
        ...(docNumber ? { docNumber } : {}),
      },
      cardToken,
      antifraudReference,
      installments: typeof body.installments === "number" ? body.installments : 1,
      metadata: { ghostscale_user: userId, ghostscale_plan: body.plan },
    });
    if (charge.status !== "paid") {
      const msg =
        charge.status === "declined"
          ? "Cartão recusado pelo banco. Tente outro cartão."
          : charge.status === "refused"
            ? "Falha técnica na operadora. Tente de novo em instantes."
            : `Cobrança não aprovada (${charge.status}).`;
      return Response.json({ ok: false, status: charge.status, error: msg }, { status: 402 });
    }
    const sub = await createSubscription(charge.id);
    const workspaceId = "ws_" + (await sha256(userId)).slice(0, 24);
    const now = Math.floor(Date.now() / 1000);
    const db = getDb();
    const prev = await db.select().from(planSubscriptions).where(eq(planSubscriptions.workspaceId, workspaceId));
    for (const p of prev) {
      if (p.status === "active" || p.status === "past_due")
        await db.update(planSubscriptions).set({ status: "replaced", updatedAt: now }).where(eq(planSubscriptions.id, p.id));
    }
    const nextTs = sub.next_payment_date ? Math.floor(new Date(sub.next_payment_date).getTime() / 1000) : null;
    await db.insert(planSubscriptions).values({
      id: crypto.randomUUID(),
      workspaceId,
      userId,
      email,
      plan: body.plan,
      status: "active",
      caktoOrderId: charge.id,
      caktoSubscriptionId: sub.id,
      caktoOfferId: offerId,
      amount: charge.amount || String(PLANS[body.plan].price),
      currency: "BRL",
      currentPeriodEnd: Number.isFinite(nextTs) ? nextTs : null,
      createdAt: now,
      updatedAt: now,
    });
    return Response.json({ ok: true, plan: body.plan, status: "active" });
  } catch (e) {
    if (e instanceof CaktoError) return Response.json({ error: friendlyCakto(e) }, { status: e.status >= 500 ? 502 : 400 });
    return Response.json({ error: e instanceof Error ? e.message : "Falha na cobrança." }, { status: 400 });
  }
}
