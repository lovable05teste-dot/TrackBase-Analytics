import { and, asc, eq, gte, inArray, isNull, lt, or } from "drizzle-orm";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { getDb } from "@/db";
import { monitorChecks, siteMonitors } from "@/db/schema";
import { describeFailure, isPrivateIp, nextMonitorState, type CheckResult } from "@/lib/monitor-core";

type Db = ReturnType<typeof getDb>;
type Monitor = typeof siteMonitors.$inferSelect;

export const CHECK_EVERY_SECONDS = 300;
const TIMEOUT_MS = 10000;
const MAX_REDIRECTS = 5;
const MAX_BODY = 512 * 1024;

// Resolve o DNS e recusa IP interno NA HORA de conectar. Assim um domínio que
// responde com IP público numa consulta e interno na outra (DNS rebinding) não passa.
function publicLookup(hostname: string, options: { all?: boolean; family?: number }, callback: (err: Error | null, address?: string | LookupAddress[], family?: number) => void) {
  dnsLookup(hostname, { all: true, family: options.family }, (err, addrs) => {
    if (err) return callback(err);
    if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) return callback(new Error("endereço não público"));
    if (options.all) return callback(null, addrs);
    callback(null, addrs[0].address, addrs[0].family);
  });
}

// GET com a conexão validada pelo publicLookup. Devolve uma Response comum
// para o resto do check seguir igual (status, location e corpo).
function fetchPinned(url: URL, headers: Record<string, string>, timeoutMs: number): Promise<Response> {
  const ip = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(ip) && isPrivateIp(ip)) return Promise.reject(new Error("endereço não público"));
  return new Promise((resolve, reject) => {
    const lib = url.protocol === "https:" ? https : http;
    const req = lib.request(url, { method: "GET", headers, lookup: publicLookup as unknown as https.RequestOptions["lookup"] }, (res) => {
      const h = new Headers();
      for (const [key, value] of Object.entries(res.headers)) if (value !== undefined) h.set(key, Array.isArray(value) ? value.join(", ") : String(value));
      const status = res.statusCode || 0;
      if (status === 204 || status === 304) {
        res.resume();
        resolve(new Response(null, { status, headers: h }));
        return;
      }
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          res.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
          res.on("end", () => controller.close());
          res.on("error", (e) => controller.error(e));
        },
        cancel() {
          res.destroy();
        },
      });
      resolve(new Response(body, { status, headers: h }));
    });
    const overall = setTimeout(() => req.destroy(new Error("timeout")), timeoutMs);
    req.on("close", () => clearTimeout(overall));
    req.on("error", (e) => {
      clearTimeout(overall);
      reject(e);
    });
    req.end();
  });
}

async function readText(res: Response) {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_BODY) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    size += value.length;
  }
  reader.cancel().catch(() => {});
  return new TextDecoder().decode(Buffer.concat(chunks.map((c) => Buffer.from(c))));
}

// Verifica uma URL pelo servidor: status HTTP real, tempo de resposta e,
// se configurado, se o texto esperado aparece na página. Segue redirects
// manualmente, validando cada destino.
export async function checkSite(rawUrl: string, keyword?: string | null): Promise<CheckResult> {
  const started = Date.now();
  try {
    let url = new URL(rawUrl);
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await fetchPinned(url, { "user-agent": "GhostScaleMonitor/1.0 (+https://www.ghostscale.com.br)", accept: "text/html,*/*" }, TIMEOUT_MS);
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        url = new URL(res.headers.get("location") as string, url);
        if (!["http:", "https:"].includes(url.protocol)) return { ok: false, code: res.status, ms: Date.now() - started, error: "redirecionamento inválido" };
        continue;
      }
      const ms = Date.now() - started;
      if (res.status >= 400) return { ok: false, code: res.status, ms, error: null };
      if (keyword && keyword.trim()) {
        const body = await readText(res);
        if (!body.toLowerCase().includes(keyword.trim().toLowerCase())) return { ok: false, code: res.status, ms, error: `texto "${keyword.trim().slice(0, 40)}" não encontrado` };
      } else res.body?.cancel().catch(() => {});
      return { ok: true, code: res.status, ms, error: null };
    }
    return { ok: false, code: null, ms: Date.now() - started, error: "redirecionamentos demais" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro";
    const error = /timeout|aborted/i.test(msg) ? "demorou mais de 10 s" : /ENOTFOUND|EAI_AGAIN/.test(msg) ? "domínio não encontrado" : /certificate|SSL|TLS/i.test(msg) ? "erro de certificado (HTTPS)" : msg === "endereço não público" ? msg : "sem resposta do servidor";
    return { ok: false, code: null, ms: null, error };
  }
}

async function alert(m: Monitor, kind: "down" | "up", detail: string) {
  try {
    const { pushToWorkspace } = await import("@/lib/push");
    const host = (() => { try { return new URL(m.url).host; } catch { return m.url; } })();
    await pushToWorkspace(m.workspaceId, kind === "down"
      ? { title: `🔴 Site fora do ar: ${host}`, body: `${detail}. Confira a página e o checkout.`, url: "/seguranca/monitoramento", tag: `tb-monitor-${m.id}` }
      : { title: `🟢 Site voltou: ${host}`, body: "A página respondeu normalmente.", url: "/seguranca/monitoramento", tag: `tb-monitor-${m.id}` });
  } catch (e) { console.error("monitor alert", e); }
}

export async function runMonitor(db: Db, m: Monitor) {
  const now = Math.floor(Date.now() / 1000);
  const result = await checkSite(m.url, m.keyword);
  const next = nextMonitorState({ status: m.status, failStreak: m.failStreak, downSince: m.downSince }, result, now);
  await db.update(siteMonitors).set({ status: next.status, failStreak: next.failStreak, downSince: next.downSince, lastCode: result.code, lastMs: result.ms, lastError: result.ok ? null : describeFailure(result), lastCheckedAt: now }).where(eq(siteMonitors.id, m.id));
  await db.insert(monitorChecks).values({ id: crypto.randomUUID(), monitorId: m.id, at: now, ok: result.ok ? 1 : 0, code: result.code, ms: result.ms });
  if (next.alert) await alert(m, next.alert, describeFailure(result));
  return { ...m, ...next, lastCode: result.code, lastMs: result.ms, lastError: result.ok ? null : describeFailure(result), lastCheckedAt: now };
}

// Roda as verificações vencidas (sem checagem há 5 min). Chamado pelo cron,
// pelo GitHub Actions e "de carona" no tráfego do script (com trava).
export async function runDueMonitors(opts: { limit?: number; workspaceId?: string; force?: boolean } = {}) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const due = or(isNull(siteMonitors.lastCheckedAt), lt(siteMonitors.lastCheckedAt, now - CHECK_EVERY_SECONDS + 15));
  const where = opts.workspaceId ? (opts.force ? eq(siteMonitors.workspaceId, opts.workspaceId) : and(eq(siteMonitors.workspaceId, opts.workspaceId), due)) : due;
  const rows = await db.select().from(siteMonitors).where(where).orderBy(asc(siteMonitors.lastCheckedAt)).limit(opts.limit ?? 50);
  const out: Awaited<ReturnType<typeof runMonitor>>[] = [];
  for (let i = 0; i < rows.length; i += 5) out.push(...await Promise.all(rows.slice(i, i + 5).map((m) => runMonitor(db, m))));
  // Histórico de 7 dias basta para o uptime.
  if (Math.random() < 0.05) await db.delete(monitorChecks).where(lt(monitorChecks.at, now - 7 * 86400)).catch(() => {});
  return { checked: out.length, down: out.filter((m) => m.status === "down").length };
}

let lastOpportunistic = 0;
// Verificação "de carona": no máximo 1x por minuto por instância.
export async function maybeRunDueMonitors() {
  if (Date.now() - lastOpportunistic < 60000) return;
  lastOpportunistic = Date.now();
  try { await runDueMonitors({ limit: 10 }); } catch (e) { console.error("monitor opportunistic", e); }
}

export async function uptimeByMonitor(db: Db, ids: string[], since: number) {
  if (!ids.length) return new Map<string, { total: number; ok: number; recent: { at: number; ok: number; ms: number | null }[] }>();
  const rows = await db.select({ monitorId: monitorChecks.monitorId, at: monitorChecks.at, ok: monitorChecks.ok, ms: monitorChecks.ms }).from(monitorChecks).where(and(inArray(monitorChecks.monitorId, ids), gte(monitorChecks.at, since))).orderBy(asc(monitorChecks.at));
  const map = new Map<string, { total: number; ok: number; recent: { at: number; ok: number; ms: number | null }[] }>();
  for (const r of rows) {
    const e = map.get(r.monitorId) || { total: 0, ok: 0, recent: [] };
    e.total++; if (r.ok) e.ok++; e.recent.push({ at: r.at, ok: r.ok, ms: r.ms });
    map.set(r.monitorId, e);
  }
  for (const e of map.values()) e.recent = e.recent.slice(-48);
  return map;
}
