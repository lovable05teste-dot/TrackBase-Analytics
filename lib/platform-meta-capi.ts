const FALLBACK_PIXEL_ID = "2154942472068771";
const APP_URL = "https://www.ghostscale.com.br";

async function digest(value: string) {
  const bytes = new TextEncoder().encode(value.trim().toLowerCase());
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sendPlatformMetaPurchase(input: { orderId: string; email?: string | null; value: number; currency: string; planName: string }) {
  const token = (process.env.META_CAPI_ACCESS_TOKEN || "").trim();
  const pixelId = (process.env.META_PIXEL_ID || FALLBACK_PIXEL_ID).trim();
  if (!token || !pixelId || !input.orderId) return false;

  const response = await fetch(`https://graph.facebook.com/v25.0/${pixelId}/events?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      data: [{
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: `purchase_${input.orderId}`,
        action_source: "website",
        event_source_url: `${APP_URL}/conta/assinatura`,
        user_data: input.email ? { em: [await digest(input.email)] } : {},
        custom_data: {
          value: input.value,
          currency: input.currency.toUpperCase() || "BRL",
          order_id: input.orderId,
          content_name: input.planName,
          content_type: "product",
        },
      }],
    }),
    signal: AbortSignal.timeout(5_000),
  });
  return response.ok;
}

export async function safePlatformMetaPurchase(input: Parameters<typeof sendPlatformMetaPurchase>[0]) {
  try { await sendPlatformMetaPurchase(input); } catch (error) { console.error("Platform Meta CAPI failed", error instanceof Error ? error.message : "unknown error"); }
}
