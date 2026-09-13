import { eq } from "drizzle-orm";
import { ensureDb, getDb } from "../../../../db";
import { apiCredentials, notificationPrefs, projects } from "../../../../db/schema";
import { decryptSecret, sha256 } from "../../../../lib/trackbase-security";
import { parseTrackingConfig } from "../../../../lib/tracking-config";
import { parsePrefs } from "../../../../lib/notify";
import { pushToWorkspace } from "../../../../lib/push";
import {
  alertUnknownStatus,
  clientIpFromHeaders,
  dispatchCapi,
  drainCapiOutbox,
  enqueueCapiOutbox,
  eventIdFor,
  eventNameFor,
  handleSalesQuota,
  insertEventOnce,
  pick,
  resolveStatus,
  upsertOrder,
} from "../../../../lib/sale-ingest";

function hashEmailPhone(value: unknown, phone = false) {
  const raw = String(value || "").trim().toLocaleLowerCase();
  const normalized = phone ? raw.replace(/\D/g, "") : raw.replace(/\s+/g, "");
  if (!normalized) return undefined;
  return sha256(normalized);
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" && Number.isFinite(v) ? String(v) : "");
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

  const externalId = String(
    pick(body, [
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
    ]) || crypto.randomUUID(),
  );
  const rawStatus = pick(body, ["status", "payment_status", "transaction_status", "event", "type", "data.status", "data.payment_status", "data.transaction.status", "order.status"]);
  // Status inédito vira pendente + alerta (nunca 400 que dropa a venda).
  const { status, known } = resolveStatus(rawStatus);
  if (!known) await alertUnknownStatus(credential.workspaceId, credential.provider, externalId, rawStatus);

  const fortpay =
    Boolean(pick(body, ["transaction_hash"])) ||
    credential.provider === "fortpay" ||
    String(pick(body, ["platform"]) || "").toLowerCase() === "fortpay" ||
    pick(body, ["transaction.amount"]) !== undefined;
  const itemsList = Array.isArray((body as { items?: unknown }).items) ? (body as { items: Array<Record<string, unknown>> }).items : [];
  const centsValue = fortpay
    ? pick(body, ["amount", "data.amount", "transaction.amount", "offer.price"])
    : pick(body, ["amount_cents", "amountCents", "total_cents", "data.amount_cents", "data.transaction.amount_cents", "order.total_cents"]);
  const rawValue = pick(body, ["value", "amount", "total", "price", "data.value", "data.amount", "data.transaction.amount", "order.total"]);
  let value: number;
  if (centsValue !== undefined) value = Number(centsValue || 0) / 100;
  else if (rawValue !== undefined) value = Number(rawValue || 0);
  else if (itemsList.length && Number.isFinite(Number(itemsList[0].price))) value = fortpay ? Number(itemsList[0].price) / 100 : Number(itemsList[0].price);
  else value = 0;
  if (!Number.isFinite(value) || value < 0) return Response.json({ error: "Valor da venda inválido" }, { status: 400, headers: cors });

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
  const utmSource = utmOf("utm_source"),
    utmMedium = utmOf("utm_medium");
  const utmContent = utmName(utmOf("utm_content") || ""),
    utmTerm = utmName(utmOf("utm_term") || "");
  const productTitle = itemsList.length ? String(itemsList[0].title || itemsList[0].name || "") : "";
  const currency = String(pick(body, ["currency", "data.currency", "data.transaction.currency"]) || "BRL").toUpperCase();
  const eventId = eventIdFor(pick(body, ["event_id", "eventId", "tracking.event_id", "metadata.event_id", "data.event_id"]), credential.provider, externalId, status);
  const paidAt = pick(body, ["paid_at", "data.paid_at"]);
  const paidTime = paidAt ? Math.floor(Date.parse(String(paidAt)) / 1000) : Math.floor(Date.now() / 1000);
  const now = Math.floor(Date.now() / 1000);
  const db = getDb();

  // Dedup: redelivery do mesmo status = 200 sem reinserir nem re-disparar.
  const { dedup, prevStatus } = await upsertOrder(db, {
    projectId: credential.projectId,
    externalId,
    provider: credential.provider,
    status,
    value,
    currency,
    utmCampaign,
    utmSource,
    utmMedium,
    utmContent,
    utmTerm,
    eventId,
  });
  const eventName = eventNameFor(status);
  if (dedup) {
    await drainCapiOutbox(db, { workspaceId: credential.workspaceId, limit: 3 });
    return Response.json({ received: true, orderId: externalId, status, event: eventName, dedup: true }, { headers: cors });
  }

  const fbc = String(pick(body, ["fbc", "tracking.fbc", "metadata.fbc", "data.tracking.fbc"]) || "");
  const fbp = String(pick(body, ["fbp", "tracking.fbp", "metadata.fbp", "data.tracking.fbp"]) || "");
  const fbclid = String(pick(body, ["fbclid", "tracking.fbclid", "metadata.fbclid", "data.tracking.fbclid"]) || "");
  const eventCreated = await insertEventOnce(db, {
    projectId: credential.projectId,
    eventId,
    eventName,
    occurredAt: Number.isFinite(paidTime) ? paidTime : now,
    value,
    currency,
    visitorId: String(pick(body, ["tb_vid", "tracking.tb_vid", "metadata.tb_vid", "data.tracking.tb_vid"]) || ""),
    fbclid,
    fbc,
    fbp,
    utmSource: String(pick(body, ["utm_source", "tracking.utm_source", "metadata.utm_source", "data.tracking.utm_source"]) || ""),
    utmCampaign: String(pick(body, ["utm_campaign", "tracking.utm_campaign", "metadata.utm_campaign", "data.tracking.utm_campaign"]) || ""),
    utmMedium: String(pick(body, ["utm_medium", "tracking.utm_medium", "metadata.utm_medium", "data.tracking.utm_medium"]) || ""),
    utmContent: String(pick(body, ["utm_content", "tracking.utm_content", "metadata.utm_content", "data.tracking.utm_content"]) || ""),
    utmTerm: String(pick(body, ["utm_term", "tracking.utm_term", "metadata.utm_term", "data.tracking.utm_term"]) || ""),
    payload: JSON.stringify(body),
  });

  // CAPI só em criação ou transição PARA approved, e só se ESTA chamada criou
  // o evento (fecha a race de redelivery concorrente). Falha → outbox.
  if (status === "approved" && prevStatus !== "approved" && eventCreated) {
    const [project] = await db.select().from(projects).where(eq(projects.id, credential.projectId)).limit(1);
    if (project?.pixelId && project.metaTokenCipher && project.metaTokenIv) {
      try {
        const accessToken = await decryptSecret(project.metaTokenCipher, project.metaTokenIv);
        const config = parseTrackingConfig(project.trackingConfig);
        const email = pick(body, ["email", "customer.email", "data.customer.email", "buyer.email"]);
        const phone = pick(body, ["phone", "customer.phone", "data.customer.phone", "buyer.phone"]);
        const sourceUrl = String(pick(body, ["url", "checkout_url", "tracking.url", "metadata.url"]) || "");
        const capiBody = {
          data: [
            {
              event_name: "Purchase",
              event_time: now,
              event_id: eventId,
              action_source: "website",
              event_source_url: sourceUrl || undefined,
              user_data: {
                client_ip_address: clientIpFromHeaders(request.headers, config.ipMode),
                client_user_agent: request.headers.get("user-agent") || undefined,
                em: await hashEmailPhone(email),
                ph: await hashEmailPhone(phone, true),
                fbc: fbc || undefined,
                fbp: fbp || undefined,
              },
              custom_data: {
                value: config.purchase.valueSource === "fixed" ? config.purchase.fixedValue : value,
                currency,
                order_id: externalId,
              },
            },
          ],
        };
        const sent = await dispatchCapi(project.pixelId, accessToken, capiBody);
        if (!sent.ok) await enqueueCapiOutbox(db, { workspaceId: credential.workspaceId, projectId: credential.projectId, pixelId: project.pixelId, eventName, eventId, payload: capiBody });
      } catch (error) {
        console.error("Gateway CAPI", error);
      }
    }
  }

  await db.update(apiCredentials).set({ lastUsedAt: new Date().toISOString() }).where(eq(apiCredentials.id, credential.id));
  // contagem idempotente por ciclo (só primeira aprovação consome franquia)
  try { await handleSalesQuota(db, credential.workspaceId, credential.provider, externalId, prevStatus, status); } catch {}
  if (status === "approved" || status === "pending") {
    const [prefRow] = await db.select().from(notificationPrefs).where(eq(notificationPrefs.workspaceId, credential.workspaceId)).limit(1);
    const prefs = parsePrefs(prefRow?.prefs);
    const allowed = status === "approved" ? prefs.approved : prefs.pending;
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
      await Promise.race([
        pushToWorkspace(credential.workspaceId, {
          title,
          body: parts.join(" · ") || (status === "approved" ? "Toque para ver a venda aprovada" : "Toque para ver a venda pendente"),
          url: "/vendas",
          tag: `tb-${status}-${externalId}`,
        }),
        new Promise(r => setTimeout(r, 3000)),
      ]).catch(() => {});
    }
  }
  // Piggyback: aproveita o tráfego p/ drenar o outbox (limitado, nunca falha).
  await drainCapiOutbox(db, { workspaceId: credential.workspaceId, limit: 3 });
  return Response.json({ received: true, orderId: externalId, status, event: eventName }, { headers: cors });
}
