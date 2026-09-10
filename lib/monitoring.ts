export type SiteProbe = { status: "online" | "falha"; ms: number | null; code: number | null };

export async function probeSite(url: string, timeoutMs = 15000): Promise<SiteProbe> {
  const t0 = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "user-agent": "TrackBase-Monitor/1.0 (+uptime-check)" },
    });
    const ms = Date.now() - t0;
    if (res.ok) return { status: "online", ms, code: res.status };
    return { status: "falha", ms, code: res.status };
  } catch {
    return { status: "falha", ms: null, code: null };
  } finally {
    clearTimeout(timer);
  }
}

export function normalizeUrl(raw: string): string | null {
  let v = raw.trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) v = "https://" + v;
  try {
    const u = new URL(v);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}
