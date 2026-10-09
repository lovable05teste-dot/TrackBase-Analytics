// A 2xx alone is not a receipt: Meta must acknowledge the submitted events.
export const CAPI_TIMEOUT_MS = 10000;
export type CapiResult = { ok: boolean; error?: string; eventsReceived?: number; traceId?: string };

export async function dispatchCapi(pixelId: string, accessToken: string, body: Record<string, unknown>): Promise<CapiResult> {
  try {
    const res = await fetch(`https://graph.facebook.com/v25.0/${encodeURIComponent(pixelId)}/events`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(CAPI_TIMEOUT_MS),
    });
    const data = await res.json().catch(() => null) as { events_received?: number; fbtrace_id?: string; error?: { code?: number; error_subcode?: number } } | null;
    const expected = Array.isArray(body.data) ? body.data.length : 0;
    if (!res.ok || data?.error) {
      // Persist codes, never the request/token or buyer data echoed by Meta.
      return { ok: false, error: `meta HTTP ${res.status}${data?.error?.code ? ` code ${data.error.code}` : ""}${data?.error?.error_subcode ? ` subcode ${data.error.error_subcode}` : ""}` };
    }
    if (!expected || !data || typeof data.events_received !== "number" || data.events_received < expected) {
      return { ok: false, error: "meta sem confirmação de recebimento" };
    }
    return { ok: true, eventsReceived: data.events_received, traceId: data.fbtrace_id };
  } catch (error) {
    return { ok: false, error: error instanceof Error && /timeout|abort/i.test(error.name) ? "meta timeout" : "meta falha de conexão" };
  }
}
