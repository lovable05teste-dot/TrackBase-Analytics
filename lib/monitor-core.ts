// Regras puras do monitoramento de sites (sem banco/rede: testáveis).

export function normalizeMonitorUrl(input: string): string {
  let v = String(input || "").trim();
  if (!v || v.length > 2048) throw new Error("Informe a URL da página.");
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  const url = new URL(v);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Use uma URL HTTP ou HTTPS, sem usuário e senha.");
  const host = url.hostname.toLowerCase();
  if (!host.includes(".") || isPrivateHost(host)) throw new Error("Informe o endereço público da página (ex.: minhaloja.com.br/oferta).");
  url.hash = "";
  return url.toString();
}

// O servidor faz a requisição: endereços internos/privados são proibidos
// para ninguém usar o monitor para acessar a rede interna (SSRF).
export function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  return isPrivateIp(h);
}

export function isPrivateIp(ip: string): boolean {
  const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
  }
  if (!ip.includes(":")) return false;
  const v6 = ip.toLowerCase();
  if (v6 === "::" || v6 === "::1") return true;
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIp(mapped[1]);
  return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(v6);
}

export type CheckResult = { ok: boolean; code: number | null; ms: number | null; error: string | null };
export type MonitorState = { status: string; failStreak: number; downSince: number | null };

// Só considera "fora do ar" na 2ª falha seguida (evita alarme por um
// soluço de rede). Retorna o novo estado e se deve avisar.
export function nextMonitorState(prev: MonitorState, result: CheckResult, now: number): MonitorState & { alert: "down" | "up" | null } {
  if (result.ok) {
    const wasDown = prev.status === "down";
    return { status: "up", failStreak: 0, downSince: null, alert: wasDown ? "up" : null };
  }
  const failStreak = prev.failStreak + 1;
  if (failStreak >= 2) {
    const wasDown = prev.status === "down";
    return { status: "down", failStreak, downSince: wasDown ? prev.downSince ?? now : now, alert: wasDown ? null : "down" };
  }
  return { status: prev.status === "down" ? "down" : prev.status, failStreak, downSince: prev.downSince, alert: null };
}

export function describeFailure(result: CheckResult): string {
  if (result.error) return result.error;
  if (result.code) return `HTTP ${result.code}`;
  return "sem resposta";
}
