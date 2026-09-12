import { eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { apiCredentials, projects } from "@/db/schema";
import { decryptSecret, sha256 } from "@/lib/trackbase-security";
import { parseTrackingConfig } from "@/lib/tracking-config";
import {
  alertUnknownStatus,
  clientIpFromHeaders,
  dispatchCapi,
  drainCapiOutbox,
  enqueueCapiOutbox,
  eventIdFor,
  eventNameFor,
  insertEventOnce,
  pick,
  resolveStatus,
  upsertOrder,
} from "@/lib/sale-ingest";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,content-type,x-utmify-signature",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}

async function hashContact(value: unknown, phone = false) {
  const raw = String(value || "").trim().toLocaleLowerCase();
  const normalized = phone ? raw.replace(/\D/g, "") : raw.replace(/\s+/g, "");
  if (!normalized) return undefined;
  return sha256(normalized);
}

async function verifyUtmifySignature(request: Request, rawBody: string, secret: string): Promise<boolean> {
  const signature = request.headers.get("x-utmify-signature") || "";
  if (!signature) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const expected = Array.from(new Uint8Array(sigBytes)).map(b => b.toString(16).padStart(2, "0")).join("");
  return signature === expected;
}

export async function POST(request: Request) {
  try {
    await ensureDb();

    const url = new URL(request.url);
    const token = url.searchParams.get("token") || "";
    if (!token) return Response.json({ error: "Credencial ausente" }, { status: 401, headers: cors });

    const [credential] = await getDb()
      .select()
      .from(apiCredentials)
      .where(eq(apiCredentials.tokenHash, (await hashContact(token)) ?? ""))
      .limit(1);

    if (!credential || !credential.active) {
      return Response.json({ error: "Credencial inválida" }, { status: 401, headers: cors });
    }

    // Lê o corpo UMA vez: o HMAC precisa do raw e o parse do objeto.
    const rawBody = await request.text();
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400, headers: cors });
    }

    // HMAC só quando configurado (nunca rejeita legítimo sem secret).
    const utmifySecret = process.env.UTMIFY_WEBHOOK_SECRET;
    if (utmifySecret && !(await verifyUtmifySignature(request, rawBody, utmifySecret))) {
      return Response.json({ error: "Assinatura inválida" }, { status: 401, headers: cors });
    }

    const externalId = String(pick(body, ["id", "transaction_id", "sale_id", "data.id", "data.transaction.id", "order_id"]) || crypto.randomUUID());
    const rawStatus = pick(body, ["status", "event", "type", "data.status", "data.transaction.status", "order.status"]);
    // Status inédito vira pendente + alerta (nunca descarta a venda).
    const { status, known } = resolveStatus(rawStatus);
    if (!known) await alertUnknownStatus(credential.workspaceId, "utmify", externalId, rawStatus);

    const centsValue = pick(body, ["amount_cents", "amountCents", "data.amount_cents", "data.transaction.amount_cents", "order.total_cents"]);
    const rawValue = pick(body, ["value", "amount", "total", "price", "data.value", "data.amount", "data.transaction.amount", "order.total"]);
    const value = centsValue !== undefined ? Number(centsValue || 0) / 100 : Number(rawValue || 0);

    if (!Number.isFinite(value) || value < 0) {
      return Response.json({ error: "Valor da venda inválido" }, { status: 400, headers: cors });
    }

    const currency = String(pick(body, ["currency", "data.currency", "data.transaction.currency"]) || "BRL").toUpperCase();
    const eventId = eventIdFor(
      pick(body, ["event_id", "eventId", "tracking.event_id", "metadata.event_id", "data.event_id"]),
      "utmify",
      externalId,
      status,
    );

    const now = Math.floor(Date.now() / 1000);
    const db = getDb();
    const utmOf = (k: string) => {
      const v = String(pick(body, [k, `tracking.${k}`, `metadata.${k}`, `data.tracking.${k}`]) || "").trim();
      return v || null;
    };

    // Dedup: redelivery do mesmo status = 200 sem reinserir nem re-disparar.
    const { dedup, prevStatus } = await upsertOrder(db, {
      projectId: credential.projectId,
      externalId,
      provider: "utmify",
      status,
      value,
      currency,
      utmCampaign: utmOf("utm_campaign"),
      utmSource: utmOf("utm_source"),
      utmMedium: utmOf("utm_medium"),
      utmContent: utmOf("utm_content"),
      utmTerm: utmOf("utm_term"),
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

    const eventCreated = await insertEventOnce(
      db,
      {
        projectId: credential.projectId,
        eventId,
        eventName,
        occurredAt: now,
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
      },
      "utmify",
    );

    // CAPI só em criação ou transição PARA approved, e só se ESTA chamada
    // criou o evento. Falha → outbox (nunca perde p/ a Meta).
    if (status === "approved" && prevStatus !== "approved" && eventCreated) {
      const [project] = await db.select().from(projects).where(eq(projects.id, credential.projectId)).limit(1);
      if (project?.pixelId && project.metaTokenCipher && project.metaTokenIv) {
        try {
          const accessToken = await decryptSecret(project.metaTokenCipher, project.metaTokenIv);
          const config = parseTrackingConfig(project.trackingConfig);
          const email = pick(body, ["email", "customer.email", "data.customer.email", "buyer.email", "customer_email"]);
          const phone = pick(body, ["phone", "customer.phone", "data.customer.phone", "buyer.phone", "customer_phone"]);
          const sourceUrl = String(pick(body, ["url", "checkout_url", "tracking.url", "metadata.url"]) || "");
          const capi: { data: unknown[]; test_event_code?: string } = {
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
                  em: await hashContact(email),
                  ph: await hashContact(phone, true),
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
          if (project.metaTestCode) capi.test_event_code = project.metaTestCode;
          const sent = await dispatchCapi(project.pixelId, accessToken, capi);
          if (!sent.ok)
            await enqueueCapiOutbox(db, { workspaceId: credential.workspaceId, projectId: credential.projectId, pixelId: project.pixelId, eventName, eventId, payload: capi });
        } catch (error) {
          console.error("Utmify CAPI", error);
        }
      }
    }

    await db.update(apiCredentials).set({ lastUsedAt: new Date().toISOString() }).where(eq(apiCredentials.id, credential.id));
    await drainCapiOutbox(db, { workspaceId: credential.workspaceId, limit: 3 });
    return Response.json({ received: true, orderId: externalId, status, event: eventName }, { headers: cors });
  } catch (error) {
    console.error("Utmify webhook error", error);
    return Response.json({ error: "Não foi possível processar o webhook" }, { status: 400, headers: cors });
  }
}
