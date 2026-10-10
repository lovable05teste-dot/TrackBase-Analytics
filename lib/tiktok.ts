// TikTok for Business: Events API (pixel pelo servidor) e Marketing API
// (contas de anúncios e relatórios de campanha).
// Docs: https://business-api.tiktok.com/portal/docs

export const TIKTOK_API = "https://business-api.tiktok.com/open_api/v1.3";
const TIMEOUT_MS = 10000;

export function tiktokConfig() {
  const appId = process.env.TIKTOK_APP_ID?.trim() || "";
  const secret = process.env.TIKTOK_APP_SECRET?.trim() || "";
  return { appId, secret, configured: Boolean(appId && secret) };
}

export function requireTiktokConfig() {
  const config = tiktokConfig();
  if (!config.configured) throw new Error("TIKTOK_NOT_CONFIGURED");
  return config;
}

export function tiktokRedirectUri() {
  // Igual ao cadastrado no app do TikTok (igualdade literal, como na Meta).
  return "https://www.ghostscale.com.br/api/tiktok/oauth/callback";
}

type TiktokResponse<T> = { code?: number; message?: string; request_id?: string; data?: T };

export async function tiktokApi<T>(path: string, init: { token?: string; query?: Record<string, unknown>; body?: unknown } = {}): Promise<T> {
  const url = new URL(`${TIKTOK_API}${path}`);
  for (const [key, value] of Object.entries(init.query || {})) {
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, typeof value === "string" ? value : JSON.stringify(value));
  }
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (init.token) headers["Access-Token"] = init.token;
  const res = await fetch(url, { method: init.body === undefined ? "GET" : "POST", headers, body: init.body === undefined ? undefined : JSON.stringify(init.body), signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  const json = (await res.json().catch(() => ({}))) as TiktokResponse<T>;
  if (!res.ok || json.code !== 0) throw new Error(`tiktok ${json.code ?? res.status}: ${String(json.message || "erro").slice(0, 160)}`);
  return json.data as T;
}

// ---------- Events API ----------

// Nomes do GhostScale → eventos padrão do TikTok. PageView fica só no
// pixel do navegador (ttq.page); AdClick/PageError/TestMode nunca saem.
export const TIKTOK_EVENT: Record<string, string> = {
  ViewContent: "ViewContent",
  AddToCart: "AddToCart",
  InitiateCheckout: "InitiateCheckout",
  Lead: "SubmitForm",
  Purchase: "CompletePayment",
};

export function isTiktokPixelCode(value: unknown) {
  return /^[A-Z0-9]{10,30}$/.test(String(value || "").trim());
}

export async function sha256Hex(value: unknown, kind: "email" | "phone" | "id" = "id") {
  let v = String(value ?? "").trim().toLowerCase();
  if (kind === "phone") {
    const digits = v.replace(/\D/g, "");
    if (!digits) return undefined;
    // TikTok pede E.164: número brasileiro sem DDI ganha +55.
    v = "+" + (digits.length <= 11 ? "55" + digits : digits);
  } else v = v.replace(/\s+/g, "");
  if (!v) return undefined;
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type TiktokEventInput = {
  event: string; eventId: string; eventTime: number; url?: string; referrer?: string;
  ttclid?: string; ttp?: string; ip?: string; ua?: string; email?: unknown; phone?: unknown; externalId?: string;
  value?: number; currency?: string; orderId?: string; contentName?: string;
};

export async function tiktokEventBody(pixelCode: string, input: TiktokEventInput, testCode?: string | null) {
  const user: Record<string, string> = {};
  if (input.ttclid) user.ttclid = input.ttclid;
  if (input.ttp) user.ttp = input.ttp;
  if (input.ip) user.ip = input.ip;
  if (input.ua) user.user_agent = input.ua;
  const email = await sha256Hex(input.email, "email");
  const phone = await sha256Hex(input.phone, "phone");
  const external = await sha256Hex(input.externalId, "id");
  if (email) user.email = email;
  if (phone) user.phone = phone;
  if (external) user.external_id = external;
  const properties: Record<string, unknown> = { currency: input.currency || "BRL", value: Number(input.value || 0), content_type: "product" };
  if (input.orderId) properties.order_id = input.orderId;
  if (input.contentName) properties.contents = [{ content_name: input.contentName }];
  const page: Record<string, string> = {};
  if (input.url) page.url = input.url;
  if (input.referrer) page.referrer = input.referrer;
  return {
    event_source: "web",
    event_source_id: pixelCode,
    ...(testCode ? { test_event_code: testCode } : {}),
    data: [{ event: input.event, event_time: input.eventTime, event_id: input.eventId, user, page, properties }],
  };
}

export async function dispatchTiktokEvent(accessToken: string, body: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  try {
    await tiktokApi("/event/track/", { token: accessToken, body });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "tiktok erro" };
  }
}

// ---------- Origem do tráfego ----------

const TIKTOK_SOURCE = /^(tiktok|tt|tiktokads|tik_tok)(?=$|[^a-z])/i;
export function isTiktokSource(utmSource: unknown) {
  return TIKTOK_SOURCE.test(String(utmSource ?? "").trim());
}

export function payloadField(payload: string | null | undefined, key: string): string {
  if (!payload) return "";
  try {
    const p = JSON.parse(payload) as Record<string, unknown>;
    const attr = p.attribution && typeof p.attribution === "object" ? (p.attribution as Record<string, unknown>) : {};
    const value = p[key] ?? attr[key];
    return typeof value === "string" ? value : "";
  } catch {
    return "";
  }
}

// UTMs prontas para colar no anúncio do TikTok (macros oficiais).
export const TIKTOK_UTM_SUFFIX = "utm_source=tiktok&utm_medium=paid&utm_campaign=__CAMPAIGN_NAME__|__CAMPAIGN_ID__&utm_term=__AID_NAME__|__AID__&utm_content=__CID_NAME__|__CID__";
