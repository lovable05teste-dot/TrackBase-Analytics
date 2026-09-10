import { eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { apiCredentials, events, orders, projects } from "@/db/schema";
import { decryptSecret } from "@/lib/trackbase-security";
import { parseTrackingConfig } from "@/lib/tracking-config";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,content-type,x-utmify-signature",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}

function pick(source: Record<string, unknown>, paths: string[]) {
  for (const path of paths) {
    let value: unknown = source;
    for (const key of path.split(".")) {
      value = value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;
    }
    if (value !== undefined && value !== null && value !== "") return value;
  }
}

function statusOf(value: unknown) {
  const s = String(value || "pending").toLowerCase();
  if (/approved|paid|completed|succeeded|success|aprovad|pago/.test(s)) return "approved";
  if (/refund|reembols|estorn/.test(s)) return "refunded";
  if (/chargeback|contestad/.test(s)) return "chargeback";
  if (/cancel|failed|recusad|expired/.test(s)) return "cancelled";
  return "pending";
}

async function hash(value: unknown, phone = false) {
  const raw = String(value || "").trim().toLocaleLowerCase();
  const normalized = phone ? raw.replace(/\D/g, "") : raw.replace(/\s+/g, "");
  if (!normalized) return undefined;
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function clientIp(request: Request, mode: "auto" | "ipv4" | "disabled") {
  if (mode === "disabled") return undefined;
  const values = (request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return mode === "ipv4" ? values.find((v) => /^\d{1,3}(\.\d{1,3}){3}$/.test(v)) : values[0];
}

async function verifyUtmifySignature(request: Request, secret: string): Promise<boolean> {
  const signature = request.headers.get("x-utmify-signature") || "";
  if (!signature) return false;
  const body = await request.text();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expected = Array.from(new Uint8Array(sigBytes)).map((b) => b.toString(16).padStart(2, "0")).join("");
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
      .where(eq(apiCredentials.tokenHash, await hash(token)))
      .limit(1);

    if (!credential || !credential.active) {
      return Response.json({ error: "Credencial inválida" }, { status: 401, headers: cors });
    }

    const body = (await request.json()) as Record<string, unknown>;

    const utmifySecret = process.env.UTMIFY_WEBHOOK_SECRET;
    if (utmifySecret && !(await verifyUtmifySignature(request, utmifySecret))) {
      return Response.json({ error: "Assinatura inválida" }, { status: 401, headers: cors });
    }

    const externalId = String(
      pick(body, ["id", "transaction_id", "sale_id", "data.id", "data.transaction.id", "order_id"]) ||
        crypto.randomUUID()
    );

    const rawStatus = pick(body, ["status", "event", "type", "data.status", "data.transaction.status", "order.status"]);
    const status = statusOf(rawStatus);

    const centsValue = pick(body, ["amount_cents", "amountCents", "data.amount_cents", "data.transaction.amount_cents", "order.total_cents"]);
    const rawValue = pick(body, ["value", "amount", "total", "price", "data.value", "data.amount", "data.transaction.amount", "order.total"]);
    const value = centsValue !== undefined ? Number(centsValue || 0) / 100 : Number(rawValue || 0);

    if (!Number.isFinite(value) || value < 0) {
      return Response.json({ error: "Valor da venda inválido" }, { status: 400, headers: cors });
    }

    const currency = String(pick(body, ["currency", "data.currency", "data.transaction.currency"]) || "BRL").toUpperCase();

    const eventId = String(
      pick(body, ["event_id", "eventId", "tracking.event_id", "metadata.event_id", "data.event_id"]) ||
        (status === "approved" ? `purchase_${externalId}` : `utmify_${credential.provider}_${externalId}_${status}`)
    );

    const now = Math.floor(Date.now() / 1000);
    const db = getDb();

    await db.insert(orders).values({
      id: crypto.randomUUID(),
      projectId: credential.projectId,
      externalId,
      provider: "utmify",
      status,
      value,
      currency,
      eventId,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: [orders.provider, orders.externalId],
      set: { status, value, currency, eventId, updatedAt: now },
    });

    const eventName = status === "approved" ? "Purchase" : status === "pending" ? "PaymentPending" : status === "refunded" ? "Refund" : status === "chargeback" ? "Chargeback" : "PaymentCancelled";

    const fbc = String(pick(body, ["fbc", "tracking.fbc", "metadata.fbc", "data.tracking.fbc"]) || "");
    const fbp = String(pick(body, ["fbp", "tracking.fbp", "metadata.fbp", "data.tracking.fbp"]) || "");
    const fbclid = String(pick(body, ["fbclid", "tracking.fbclid", "metadata.fbclid", "data.tracking.fbclid"]) || "");

    await db.insert(events).values({
      id: crypto.randomUUID(),
      projectId: credential.projectId,
      eventId,
      eventName,
      source: "utmify",
      occurredAt: now,
      value,
      currency,
      payload: JSON.stringify(body),
      visitorId: String(pick(body, ["tb_vid", "tracking.tb_vid", "metadata.tb_vid", "data.tracking.tb_vid"]) || ""),
      fbclid,
      fbc,
      fbp,
      utmSource: String(pick(body, ["utm_source", "tracking.utm_source", "metadata.utm_source", "data.tracking.utm_source"]) || ""),
      utmCampaign: String(pick(body, ["utm_campaign", "tracking.utm_campaign", "metadata.utm_campaign", "data.tracking.utm_campaign"]) || ""),
      utmMedium: String(pick(body, ["utm_medium", "tracking.utm_medium", "metadata.utm_medium", "data.tracking.utm_medium"]) || ""),
      utmContent: String(pick(body, ["utm_content", "tracking.utm_content", "metadata.utm_content", "data.tracking.utm_content"]) || ""),
      utmTerm: String(pick(body, ["utm_term", "tracking.utm_term", "metadata.utm_term", "data.tracking.utm_term"]) || ""),
    }).onConflictDoNothing();

    if (status === "approved") {
      const [project] = await db.select().from(projects).where(eq(projects.id, credential.projectId)).limit(1);
      if (project?.pixelId && project.metaTokenCipher && project.metaTokenIv) {
        try {
          const accessToken = await decryptSecret(project.metaTokenCipher, project.metaTokenIv);
          const config = parseTrackingConfig(project.trackingConfig);
          const email = pick(body, ["email", "customer.email", "data.customer.email", "buyer.email", "customer_email"]);
          const phone = pick(body, ["phone", "customer.phone", "data.customer.phone", "buyer.phone", "customer_phone"]);
          const sourceUrl = String(pick(body, ["url", "checkout_url", "tracking.url", "metadata.url"]) || "");
          const capi = {
            data: [
              {
                event_name: "Purchase",
                event_time: now,
                event_id: eventId,
                action_source: "website",
                event_source_url: sourceUrl || undefined,
                user_data: {
                  client_ip_address: clientIp(request, config.ipMode),
                  client_user_agent: request.headers.get("user-agent") || undefined,
                  em: await hash(email),
                  ph: await hash(phone, true),
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
          await fetch(`https://graph.facebook.com/v25.0/${project.pixelId}/events?access_token=${encodeURIComponent(accessToken)}`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(capi),
          });
        } catch (error) {
          console.error("Utmify CAPI", error);
        }
      }
    }

    await db.update(apiCredentials).set({ lastUsedAt: new Date().toISOString() }).where(eq(apiCredentials.id, credential.id));

    return Response.json({ received: true, orderId: externalId, status, event: eventName }, { headers: cors });
  } catch (error) {
    console.error("Utmify webhook error", error);
    return Response.json({ error: "Não foi possível processar o webhook" }, { status: 400, headers: cors });
  }
}