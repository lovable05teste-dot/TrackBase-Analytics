import { isIP } from "node:net";

export function normalizeIp(raw: string): string {
  const input = raw.trim();
  const version = isIP(input);
  if (!version || input.includes("%")) throw new Error("Informe um IPv4 ou IPv6 válido, sem porta ou máscara de rede.");
  if (version === 4) return input;
  const host = new URL(`http://[${input}]/`).hostname.slice(1, -1);
  // A mesma origem pode chegar ao proxy como IPv4 ou IPv4-mapped IPv6.
  if (host.startsWith("::ffff:")) {
    const parts = host.slice(7).split(":");
    if (parts.length === 2) return parts.flatMap(p => { const n = parseInt(p, 16); return [n >> 8, n & 255]; }).join(".");
  }
  return host;
}

export function requestIp(request: Request): string | null {
  // A Vercel sobrescreve x-vercel-forwarded-for. Fora dela, cf-connecting-ip
  // só é confiável quando o servidor recebe tráfego exclusivamente da Cloudflare.
  const value = (process.env.VERCEL ? request.headers.get("x-vercel-forwarded-for") : request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for"))?.split(",")[0];
  try { return value ? normalizeIp(value) : null; } catch { return null; }
}

export function parseBlockedIps(raw: string | null | undefined): string[] {
  try { const list = JSON.parse(raw || "[]"); return Array.isArray(list) ? list.filter(v => typeof v === "string").map(normalizeIp) : []; } catch { return []; }
}
