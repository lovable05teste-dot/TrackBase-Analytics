import { and, eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { monitoredSites, siteChecks } from "@/db/schema";
import { probeSite } from "@/lib/monitoring";
import { pushToWorkspace } from "@/lib/push";
import { requestUserId, sha256 } from "@/lib/trackbase-security";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function scope(request: Request): Promise<{ workspaceId: string | null; siteId: string } | { error: string }> {
  const url = new URL(request.url);
  const siteId = url.searchParams.get("siteId") || "";
  const required = process.env.CRON_SECRET || "";
  const cronOk = required && (url.searchParams.get("secret") === required || request.headers.get("authorization") === `Bearer ${required}`);
  if (cronOk) return { workspaceId: null, siteId };
  if (!required) return { workspaceId: null, siteId };
  const userId = await requestUserId(request);
  if (!userId) return { error: "Não autorizado." };
  return { workspaceId: "ws_" + (await sha256(userId)).slice(0, 24), siteId };
}

export async function GET(request: Request) {
  const s = await scope(request);
  if ("error" in s) return Response.json({ error: s.error }, { status: 401 });
  await ensureDb();
  const db = getDb();
  let sites;
  if (s.siteId) {
    const rows = await db.select().from(monitoredSites).where(eq(monitoredSites.id, s.siteId));
    if (s.workspaceId && rows.length && rows[0].workspaceId !== s.workspaceId) return Response.json({ error: "Não autorizado." }, { status: 403 });
    sites = s.workspaceId ? rows.filter((r) => r.workspaceId === s.workspaceId) : rows;
  } else if (s.workspaceId) {
    sites = await db.select().from(monitoredSites).where(and(eq(monitoredSites.workspaceId, s.workspaceId), eq(monitoredSites.active, 1)));
  } else {
    sites = await db.select().from(monitoredSites).where(eq(monitoredSites.active, 1));
  }
  const now = Math.floor(Date.now() / 1000);
  const results = [];
  for (const site of sites) {
    try {
      const probe = await probeSite(site.url);
      const failures = probe.status === "falha" ? (site.consecutiveFailures || 0) + 1 : 0;
      const wasOnline = (site.lastStatus || "online") === "online";
      await db.insert(siteChecks).values({ id: crypto.randomUUID(), siteId: site.id, status: probe.status, ms: probe.ms, code: probe.code, checkedAt: now });
      await db.update(monitoredSites).set({ lastStatus: probe.status, lastMs: probe.ms, lastCode: probe.code, lastCheckedAt: now, consecutiveFailures: failures }).where(eq(monitoredSites.id, site.id));
      if (probe.status === "falha" && failures === 1) {
        await pushToWorkspace(site.workspaceId, { title: `Site fora do ar · ${site.url}`, body: "O monitoramento detectou falha agora. Toque para ver.", url: "/seguranca/monitoramento", tag: `tb-down-${site.id}-${now}` }).catch(() => {});
      } else if (probe.status === "online" && !wasOnline) {
        await pushToWorkspace(site.workspaceId, { title: `Site voltou ao ar · ${site.url}`, body: `Resposta em ${probe.ms ?? "?"}ms.`, url: "/seguranca/monitoramento", tag: `tb-up-${site.id}-${now}` }).catch(() => {});
      }
      results.push({ siteId: site.id, url: site.url, ...probe });
    } catch (e) {
      results.push({ siteId: site.id, url: site.url, error: e instanceof Error ? e.message : "falha" });
    }
  }
  return Response.json({ ok: true, checked: results.length, results });
}
