import { createHmac, timingSafeEqual } from "node:crypto";
import { isPlanId, planOfferId, type PlanId } from "./cakto-plans";

const BASE = "https://api.cakto.com.br";

export class CaktoError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(`Cakto API error ${status}`);
    this.status = status;
    this.body = body;
  }
}

function creds() {
  const clientId = process.env.CAKTO_CLIENT_ID?.trim();
  const clientSecret = process.env.CAKTO_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("Credenciais da Cakto não configuradas (CAKTO_CLIENT_ID/CAKTO_CLIENT_SECRET).");
  return { clientId, clientSecret };
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) return cachedToken.token;
  const { clientId, clientSecret } = creds();
  const r = await fetch(`${BASE}/public_api/token/`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret }),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new CaktoError(r.status, body);
  const token = String((body as { access_token?: unknown }).access_token || "");
  const expiresIn = Number((body as { expires_in?: unknown }).expires_in || 36000);
  if (!token) throw new Error("Cakto não devolveu access_token.");
  cachedToken = { token, expiresAt: Date.now() + expiresIn * 1000 };
  return token;
}

async function caktoFetch<T>(path: string, init: { method?: string; body?: unknown; idempotencyKey?: string } = {}): Promise<T> {
  const token = await getAccessToken();
  const headers: Record<string, string> = { authorization: `Bearer ${token}`, "content-type": "application/json" };
  if (init.idempotencyKey) headers["X-Idempotency-Key"] = init.idempotencyKey;
  const r = await fetch(`${BASE}${path}`, {
    method: init.method || "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const data = (await r.json().catch(() => ({}))) as T;
  if (!r.ok) {
    if (r.status === 401) cachedToken = null;
    throw new CaktoError(r.status, data);
  }
  return data;
}

export type CaktoCustomer = {
  name: string;
  email: string;
  phone: string;
  fingerprint: string;
  docType?: "cpf" | "cnpj";
  docNumber?: string;
};

export type CaktoPayment = {
  id: string;
  refId?: string;
  status: string;
  amount?: string;
  paymentMethod?: string;
  offer?: { id?: string; name?: string; price?: number };
  product?: { id?: string; name?: string };
};

export async function createCardCharge(input: {
  plan: PlanId;
  customer: CaktoCustomer;
  cardToken: string;
  antifraudReference: string;
  installments?: number;
  metadata?: Record<string, string>;
}): Promise<CaktoPayment> {
  if (!isPlanId(input.plan)) throw new Error("Plano inválido.");
  const offerId = planOfferId(input.plan);
  if (!offerId) throw new Error(`Oferta da Cakto para o plano ${input.plan} não configurada.`);
  const installments = Math.min(12, Math.max(1, Math.floor(input.installments || 1)));
  return caktoFetch<CaktoPayment>("/public_api/payments/", {
    method: "POST",
    idempotencyKey: crypto.randomUUID(),
    body: {
      paymentMethod: "credit_card",
      customer: {
        name: input.customer.name,
        email: input.customer.email,
        phone: input.customer.phone,
        fingerprint: input.customer.fingerprint,
        ...(input.customer.docType ? { docType: input.customer.docType } : {}),
        ...(input.customer.docNumber ? { docNumber: input.customer.docNumber } : {}),
      },
      items: [{ offerId }],
      card: { token: input.cardToken },
      installments,
      ...(input.metadata ? { metadata: input.metadata } : {}),
      antifraud_profiling_attempt_reference: input.antifraudReference,
    },
  });
}

export type CaktoSubscription = {
  id: string;
  status: string;
  amount?: string;
  next_payment_date?: string | null;
  parent_order?: string;
  offer?: string;
  product?: string;
};

export async function createSubscription(parentOrderId: string): Promise<CaktoSubscription> {
  return caktoFetch<CaktoSubscription>("/public_api/subscriptions/", {
    method: "POST",
    body: { parent_order_id: parentOrderId },
  });
}

export async function cancelSubscription(subscriptionId: string): Promise<{ detail?: string; status?: string }> {
  return caktoFetch(`/public_api/subscriptions/${encodeURIComponent(subscriptionId)}/cancel/`, { method: "POST" });
}

export function verifyWebhookSignature(rawBody: string, timestamp: string, signature: string): boolean {
  const secret = process.env.CAKTO_WEBHOOK_SECRET?.trim();
  if (!secret || !timestamp || !signature) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 5 * 60) return false;
  const expected = `v1=${createHmac("sha256", secret).update(`${timestamp}.`).update(rawBody).digest("hex")}`;
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyWebhookSecret(received: unknown): boolean {
  const secret = process.env.CAKTO_WEBHOOK_SECRET?.trim();
  if (!secret || typeof received !== "string") return false;
  const a = Buffer.from(received);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
