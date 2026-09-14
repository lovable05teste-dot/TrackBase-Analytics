const DEFAULT_MEASUREMENT_ID = "G-YV71CM9ETF";

type AnalyticsValue = string | number | boolean | null | undefined;

type ServerAnalyticsEvent = {
  name: string;
  clientId: string;
  userId?: string;
  params?: Record<string, AnalyticsValue | Array<Record<string, AnalyticsValue>>>;
};

export async function sendServerAnalyticsEvent(event: ServerAnalyticsEvent): Promise<boolean> {
  const measurementId = (process.env.GA_MEASUREMENT_ID || DEFAULT_MEASUREMENT_ID).trim();
  const apiSecret = (process.env.GA_API_SECRET || "").trim();
  if (!measurementId || !apiSecret) return false;

  const endpoint = new URL("https://www.google-analytics.com/mp/collect");
  endpoint.searchParams.set("measurement_id", measurementId);
  endpoint.searchParams.set("api_secret", apiSecret);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: event.clientId,
      ...(event.userId ? { user_id: event.userId } : {}),
      timestamp_micros: String(Date.now() * 1000),
      events: [{
        name: event.name,
        params: {
          engagement_time_msec: 1,
          session_id: Math.floor(Date.now() / 1000),
          ...event.params,
        },
      }],
    }),
    signal: AbortSignal.timeout(5_000),
  });
  return response.ok;
}

export async function safeServerAnalyticsEvent(event: ServerAnalyticsEvent): Promise<void> {
  try {
    const sent = await sendServerAnalyticsEvent(event);
    if (!sent && process.env.NODE_ENV !== "test") console.warn("Google Analytics server event was not accepted", event.name);
  } catch (error) {
    console.error("Google Analytics server event failed", event.name, error instanceof Error ? error.message : "unknown error");
  }
}

export function serverAnalyticsClientId(userId: string): string {
  const numeric = Array.from(userId).reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 2166136261);
  const secondary = Array.from(userId).reduce((sum, char) => (sum * 33 + char.charCodeAt(0)) >>> 0, 5381);
  return `${numeric}.${secondary}`;
}
