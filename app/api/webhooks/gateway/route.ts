import { queuePurchaseCapi } from "@/lib/purchase-capi";
import { readAmount, reviewNote } from "@/lib/webhook-review";
import { and, eq } from "drizzle-orm";
import { ensureDb, getDb } from "../../../../db";
import { apiCredentials, events, notificationPrefs, projects } from "../../../../db/schema";
import { sha256 } from "../../../../lib/trackbase-security";
import { parsePrefs } from "../../../../lib/notify";
import { notifySale, recordSaleEvent } from "../../../../lib/push";
import {
  alertUnknownStatus,
  cleanUtmSource,
  drainCapiOutbox,
  eventIdFor,
  eventNameFor,
  handleSalesQuota,
  insertEventOnce,
  pick,
  resolveStatus,
  parsePaidAt,
  upsertOrder,
  visitorAttribution,
} from "../../../../lib/sale-ingest";

// Dados do comprador (e-mail, nome, telefone). Só texto curto; vazio = null.
function buyerField(body: Record<string, unknown>, paths: string[]) {
  return str(pick(body, paths)).slice(0, 160);
}
const str = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" && Number.isFinite(v) ? String(v) : "");
export const maxDuration = 60;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,x-trackbase-key,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};
export function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}

export async function POST(request: Request) {
  await ensureDb();
  const url = new URL(request.url);
  // Autenticação inalterada: bearer (credencial tb_live_*) — nunca enfraquecida.
  const auth = request.headers.get("authorization") || "";
  const token = (auth.startsWith("Bearer ") ? auth.slice(7) : request.headers.get("x-trackbase-key") || url.searchParams.get("token") || "").trim();
  if (!token) return Response.json({ error: "Credencial ausente" }, { status: 401, headers: cors });
  const [credential] = await getDb().select().from(apiCredentials).where(eq(apiCredentials.tokenHash, await sha256(token))).limit(1);
  const credActive = credential && (credential.active === 1 || (credential.active as unknown) === true);
  if (!credential || !credActive) return Response.json({ error: "Credencial inválida" }, { status: 401, headers: cors });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400, headers: cors });
  }

  const providerOrderId = pick(body, [
      "transaction_hash",
      "transactionHash",
      "transaction.id",
      "reference",
      "reference_id",
      "order_number",
      "id",
      "transaction_id",
      "transactionId",
      "sale_id",
      "saleId",
      "data.id",
      "data.transaction.id",
      "order.id",
      "order_id",
      "orderId",
  ]);
  // Sem ID do pedido: hash do corpo, para o reenvio do mesmo webhook não virar
  // venda duplicada. O pedido é marcado para revisão.
  const idFromProvider = String(providerOrderId ?? "").trim() !== "";
  const externalId = idFromProvider ? String(providerOrderId).trim() : "sem_id_" + (await sha256(JSON.stringify(body))).slice(0, 24);
  const rawStatus = pick(body, ["status", "payment_status", "transaction_status", "event", "type", "data.status", "data.payment_status", "data.transaction.status", "order.status"]);
  // Status inédito vira pendente + alerta (nunca 400 que dropa a venda).
  const { status, known } = resolveStatus(rawStatus);
  if (!known) await alertUnknownStatus(credential.workspaceId, credential.provider, externalId, rawStatus);

  const fortpay =
    Boolean(pick(body, ["transaction_hash"])) ||
    credential.provider === "fortpay" ||
    // Antes qualquer payload com transaction.amount era tratado como FortPay
    // (centavos) e R$ 97,00 de outro gateway virava R$ 0,97.
    String(pick(body, ["platform"]) || "").toLowerCase() === "fortpay";
  const itemsList = Array.isArray((body as { items?: unknown }).items) ? (body as { items: Array<Record<string, unknown>> }).items : [];
  const centsValue = fortpay
    ? pick(body, ["amount", "data.amount", "transaction.amount", "offer.price"])
    : pick(body, ["amount_cents", "amountCents", "total_cents", "data.amount_cents", "data.transaction.amount_cents", "order.total_cents"]);
  const rawValue = pick(body, ["value", "amount", "total", "price", "data.value", "data.amount", "data.transaction.amount", "order.total"]);
  // Valor: centavos (campo de centavos ou FortPay) ou reais. Valor ausente ou
  // ilegível não vira 0 em silêncio: o pedido é marcado para revisão.
  const amountField = centsValue !== undefined ? centsValue : rawValue !== undefined ? rawValue : itemsList.length ? itemsList[0].price : undefined;
  const amountRead = readAmount(amountField);
  const inCents = centsValue !== undefined || (rawValue === undefined && fortpay && amountField !== undefined);
  const value = amountRead.source === "explicit" && inCents ? amountRead.value / 100 : amountRead.value;

  const rawUtm = String(pick(body, ["utm_campaign", "tracking.utm_campaign", "metadata.utm_campaign", "data.tracking.utm_campaign"]) || "").trim();
  const utmName = (v: string) => {
    const t = v.trim();
    return t ? t.split("|")[0].trim() || null : null;
  };
  const utmCampaign = utmName(rawUtm);
  const utmOf = (k: string) => {
    const v = String(pick(body, [k, `tracking.${k}`, `metadata.${k}`, `data.tracking.${k}`]) || "").trim();
    return v || null;
  };
  const utmSource = cleanUtmSource(utmOf("utm_source")),
    utmMedium = utmOf("utm_medium");
  const utmContent = utmName(utmOf("utm_content") || ""),
    utmTerm = utmName(utmOf("utm_term") || "");
  const productTitle = itemsList.length ? String(itemsList[0].title || itemsList[0].name || "") : "";
  const currency = String(pick(body, ["currency", "data.currency", "data.transaction.currency"]) || "BRL").toUpperCase();
  const eventId = eventIdFor(pick(body, ["event_id", "eventId", "tracking.event_id", "metadata.event_id", "data.event_id"]), credential.provider, externalId, status);
  const paidAt = pick(body, ["paid_at", "data.paid_at"]);
  const now = Math.floor(Date.now() / 1000);
  const paidTime = parsePaidAt(paidAt, now);
  const db = getDb();

  const fbc = String(pick(body, ["fbc", "tracking.fbc", "trackingParameters.fbc", "metadata.fbc", "data.tracking.fbc"]) || "");
  const fbp = String(pick(body, ["fbp", "tracking.fbp", "trackingParameters.fbp", "metadata.fbp", "data.tracking.fbp"]) || "");
  const fbclid = String(pick(body, ["fbclid", "tracking.fbclid", "trackingParameters.fbclid", "metadata.fbclid", "data.tracking.fbclid"]) || "");
  const visitorId = String(pick(body, ["tb_vid", "tracking.tb_vid", "trackingParameters.tb_vid", "metadata.tb_vid", "data.tracking.tb_vid"]) || "");
  // Sem UTM/fbclid no webhook, usa a última visita do mesmo visitante (tb_vid).
  // O que o gateway mandou tem prioridade; a visita só preenche o que faltou.
  const fromVisit = visitorId ? await visitorAttribution(db, credential.projectId, visitorId) : {};
  const attr = {
    utmCampaign: utmCampaign || fromVisit.utmCampaign || null,
    utmSource: utmSource || fromVisit.utmSource || null,
    utmMedium: utmMedium || fromVisit.utmMedium || null,
    utmContent: utmContent || fromVisit.utmContent || null,
    utmTerm: utmTerm || fromVisit.utmTerm || null,
  };
  const fbclidAttr = fbclid || fromVisit.fbclid || "";
  const fbcAttr = fbc || fromVisit.fbc || "";
  const fbpAttr = fbp || fromVisit.fbp || "";

  // Dedup: redelivery do mesmo status = 200 sem reinserir nem re-disparar.
  const orderReviewNote = reviewNote({ idFromProvider, knownStatus: known, amount: amountRead });
  if (orderReviewNote) console.warn(JSON.stringify({ scope: "webhook", event: "order-needs-review", provider: credential.provider, orderId: externalId, note: orderReviewNote }));
  const { dedup, prevStatus } = await upsertOrder(db, {
    projectId: credential.projectId,
    externalId,
    provider: credential.provider,
    status,
    value,
    currency,
    ...attr,
    eventId,
    customerEmail: buyerField(body, ["customer.email", "buyer.email", "email", "data.customer.email", "data.buyer.email", "client.email"]).toLowerCase() || null,
    customerName: buyerField(body, ["customer.name", "buyer.name", "name", "data.customer.name", "data.buyer.name", "client.name"]) || null,
    customerPhone: buyerField(body, ["customer.phone", "customer.phone_number", "buyer.phone", "phone", "data.customer.phone", "client.phone"]) || null,
    reviewNote: orderReviewNote,
  });
  const eventName = eventNameFor(status);
  await recordSaleEvent(credential.workspaceId, "sale.received", externalId, { status, raw: String(rawStatus ?? "").slice(0, 40), provider: credential.provider, dedup });
  if (dedup && status !== "approved") {
    await drainCapiOutbox(db, { workspaceId: credential.workspaceId, limit: 3 });
    return Response.json({ received: true, orderId: externalId, status, event: eventName, dedup: true }, { headers: cors });
  }

  await insertEventOnce(db, {
    projectId: credential.projectId,
    eventId,
    eventName,
    occurredAt: paidTime,
    value,
    currency,
    visitorId,
    fbclid: fbclidAttr,
    fbc: fbcAttr,
    fbp: fbpAttr,
    utmSource: attr.utmSource || "",
    utmCampaign: attr.utmCampaign || "",
    utmMedium: attr.utmMedium || "",
    utmContent: attr.utmContent || "",
    utmTerm: attr.utmTerm || "",
    payload: JSON.stringify(body),
  });

  // Repeated approvals can repair an interrupted enqueue. The delivery
  // receipt and Meta event_id prevent sending the same purchase twice.
  let capiStatus: string | undefined;
  if (status === "approved") {
    const [saved] = await db.select({ occurredAt: events.occurredAt, eventName: events.eventName }).from(events)
      .where(and(eq(events.projectId, credential.projectId), eq(events.eventId, eventId))).limit(1);
    // Never replay historical purchases beyond Meta's 48h deduplication window.
    if (saved?.eventName === "Purchase" && (!dedup || now - saved.occurredAt < 47 * 3600)) {
      capiStatus = await queuePurchaseCapi(db, { workspaceId: credential.workspaceId, projectId: credential.projectId,
        eventId, externalId, occurredAt: saved.occurredAt, value, currency, body, visitorId, fbclid: fbclidAttr, fbc: fbcAttr, fbp: fbpAttr });
    }
  }
  if (dedup) {
    return Response.json({ received: true, orderId: externalId, status, event: eventName, dedup: true, capi: capiStatus }, { headers: cors });
  }

  await db.update(apiCredentials).set({ lastUsedAt: new Date().toISOString() }).where(eq(apiCredentials.id, credential.id));
  // contagem idempotente por ciclo (só primeira aprovação consome franquia)
  try { await handleSalesQuota(db, credential.workspaceId, credential.provider, externalId, prevStatus, status); } catch {}
  if (status === "approved" || status === "pending") {
    const [prefRow] = await db.select().from(notificationPrefs).where(eq(notificationPrefs.workspaceId, credential.workspaceId)).limit(1);
    const prefs = parsePrefs(prefRow?.prefs);
    const allowed = status === "approved" ? prefs.approved : prefs.pending;
    if (!allowed) await recordSaleEvent(credential.workspaceId, "push.sale", externalId, { status, skipped: "desativado em Notificações" });
    if (allowed) {
      const money = `R$ ${value.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
      const title = (status === "approved" ? "Venda aprovada" : "Venda pendente") + (prefs.showValue ? ` · ${money}` : "");
      const parts: string[] = [];
      if (prefs.showProject) {
        const [proj] = await db.select({ name: projects.name }).from(projects).where(eq(projects.id, credential.projectId)).limit(1);
        const pn = proj ? str(proj.name) : "";
        if (pn) parts.push(pn);
      }
      if (prefs.showProduct) {
        const prod = str(pick(body, ["product", "product_name", "productName", "item_name", "itemName", "offer_name", "data.product", "data.product_name"])) || str(productTitle);
        if (prod) parts.push(prod);
      }
      if (prefs.showUtm) {
        const u = str(pick(body, ["utm_campaign", "tracking.utm_campaign", "metadata.utm_campaign", "data.tracking.utm_campaign"]));
        const nm = u ? u.split("|")[0].trim() : "";
        if (nm) parts.push(nm);
      }
      await notifySale(credential.workspaceId, externalId, status, {
          title,
          body: parts.join(" · ") || (status === "approved" ? "Toque para ver a venda aprovada" : "Toque para ver a venda pendente"),
          url: "/vendas",
          tag: `tb-${status}-${externalId}`,
        });
    }
  }
  // Piggyback: aproveita o tráfego p/ drenar o outbox (limitado, nunca falha).
  await drainCapiOutbox(db, { workspaceId: credential.workspaceId, limit: 3 });
  return Response.json({ received: true, orderId: externalId, status, event: eventName, capi: capiStatus }, { headers: cors });
}
