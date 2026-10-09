import { and, eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { monitorChecks, siteMonitors, toolStates } from "@/db/schema";
import { normalizeMonitorUrl } from "@/lib/monitor-core";
import { requireFeature } from "@/lib/permissions";
import { runDueMonitors, runMonitor, uptimeByMonitor } from "@/lib/site-monitor";
import { requestUserId, sha256 } from "@/lib/trackbase-security";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const LIMIT = 30;
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

async function context(request: Request) {
  const userId = await requestUserId(request);
  if (!userId) return null;
  await ensureDb();
  return { userId, workspaceId: "ws_" + (await sha256(userId)).slice(0, 24), db: getDb() };
}

// Importa a lista antiga (verificação pelo navegador) uma única vez.
async function importLegacy(ctx: NonNullable<Awaited<ReturnType<typeof context>>>) {
  const [legacy] = await ctx.db.select().from(toolStates).where(and(eq(toolStates.workspaceId, ctx.workspaceId), eq(toolStates.tool, "monitoramento"))).limit(1);
  if (!legacy) return;
  let urls: string[] = [];
  try { urls = (JSON.parse(legacy.data) as { url?: string }[]).map((s) => String(s.url || "")).filter(Boolean); } catch {}
  const now = Math.floor(Date.now() / 1000);
  for (const raw of urls.slice(0, LIMIT)) {
    try { await ctx.db.insert(siteMonitors).values({ id: crypto.randomUUID(), workspaceId: ctx.workspaceId, url: normalizeMonitorUrl(raw), createdAt: now }); } catch {}
  }
  await ctx.db.delete(toolStates).where(eq(toolStates.id, legacy.id));
}

async function list(ctx: NonNullable<Awaited<ReturnType<typeof context>>>) {
  const rows = await ctx.db.select().from(siteMonitors).where(eq(siteMonitors.workspaceId, ctx.workspaceId));
  const since = Math.floor(Date.now() / 1000) - 86400;
  const up = await uptimeByMonitor(ctx.db, rows.map((r) => r.id), since);
  return rows.sort((a, b) => a.createdAt - b.createdAt).map((r) => {
    const u = up.get(r.id);
    return { id: r.id, url: r.url, keyword: r.keyword, status: r.status, code: r.lastCode, ms: r.lastMs, error: r.lastError, checkedAt: r.lastCheckedAt, downSince: r.downSince, uptime24h: u && u.total ? Math.round((u.ok / u.total) * 1000) / 10 : null, checks24h: u?.total ?? 0, recent: u?.recent ?? [] };
  });
}

export async function GET(request: Request) {
  const ctx = await context(request);
  if (!ctx) return json({ error: "Não autenticado" }, 401);
  const canEdit = await requireFeature(ctx.userId, "monitoramento");
  if (canEdit) await importLegacy(ctx).catch((e) => console.error("monitor legacy", e));
  return json({ monitors: await list(ctx), canEdit, everySeconds: 300 });
}

export async function POST(request: Request) {
  const ctx = await context(request);
  if (!ctx) return json({ error: "Não autenticado" }, 401);
  if (!(await requireFeature(ctx.userId, "monitoramento"))) return json({ error: "Seu plano precisa incluir o Monitoramento de Sites.", upgrade: "/planos" }, 402);
  const action = new URL(request.url).searchParams.get("action");
  if (action === "check") {
    await runDueMonitors({ workspaceId: ctx.workspaceId, force: true, limit: LIMIT });
    return json({ monitors: await list(ctx) });
  }
  const body = (await request.json().catch(() => ({}))) as { url?: unknown; keyword?: unknown };
  let url: string;
  try { url = normalizeMonitorUrl(String(body.url || "")); } catch (e) { return json({ error: e instanceof Error ? e.message : "URL inválida." }, 400); }
  const keyword = typeof body.keyword === "string" && body.keyword.trim() ? body.keyword.trim().slice(0, 120) : null;
  const existing = await ctx.db.select({ id: siteMonitors.id, url: siteMonitors.url }).from(siteMonitors).where(eq(siteMonitors.workspaceId, ctx.workspaceId));
  if (existing.length >= LIMIT) return json({ error: `Limite de ${LIMIT} endereços.` }, 400);
  if (existing.some((m) => m.url.toLowerCase() === url.toLowerCase())) return json({ error: "Esse endereço já está sendo monitorado." }, 409);
  const id = crypto.randomUUID();
  await ctx.db.insert(siteMonitors).values({ id, workspaceId: ctx.workspaceId, url, keyword, createdAt: Math.floor(Date.now() / 1000) });
  const [row] = await ctx.db.select().from(siteMonitors).where(eq(siteMonitors.id, id)).limit(1);
  if (row) await runMonitor(ctx.db, row);
  return json({ monitors: await list(ctx) });
}

export async function DELETE(request: Request) {
  const ctx = await context(request);
  if (!ctx) return json({ error: "Não autenticado" }, 401);
  const id = new URL(request.url).searchParams.get("id") || "";
  const [row] = await ctx.db.select({ id: siteMonitors.id }).from(siteMonitors).where(and(eq(siteMonitors.id, id), eq(siteMonitors.workspaceId, ctx.workspaceId))).limit(1);
  if (!row) return json({ error: "Endereço não encontrado." }, 404);
  await ctx.db.delete(monitorChecks).where(eq(monitorChecks.monitorId, id));
  await ctx.db.delete(siteMonitors).where(eq(siteMonitors.id, id));
  return json({ monitors: await list(ctx) });
}
