import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { events, projects, tiktokAccounts } from "@/db/schema";
import { isTestEvent, testVisitorIds } from "@/lib/test-traffic";
import { isTiktokSource, payloadField, tiktokApi } from "@/lib/tiktok";
import { buildUtmIndex } from "@/lib/utm-match";
import { decryptSecret, requestUserId, sha256 } from "@/lib/trackbase-security";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ReportRow = { dimensions?: { campaign_id?: string }; metrics?: Record<string, string> };
type Report = { list?: ReportRow[]; page_info?: { total_page?: number } };
type Campaign = { campaign_id: string; campaign_name?: string; operation_status?: string; secondary_status?: string; budget?: number; budget_mode?: string };

const PERIODS = new Set(["today", "yesterday", "last_7d", "last_30d", "this_month"]);

// Datas no fuso de Brasília (YYYY-MM-DD) e o intervalo em segundos.
function range(period: string) {
  const day = (offset: number) => new Date(Date.now() - 3 * 3600000 - offset * 86400000).toISOString().slice(0, 10);
  const today = day(0);
  const [start, end] = period === "yesterday" ? [day(1), day(1)] : period === "last_7d" ? [day(6), today] : period === "last_30d" ? [day(29), today] : period === "this_month" ? [today.slice(0, 8) + "01", today] : [today, today];
  return { start, end, from: Math.floor(Date.parse(`${start}T00:00:00-03:00`) / 1000), to: Math.floor(Date.parse(`${end}T23:59:59-03:00`) / 1000) };
}

async function accountItems(account: typeof tiktokAccounts.$inferSelect, r: ReturnType<typeof range>) {
  const token = await decryptSecret(account.accessTokenCipher, account.accessTokenIv);
  const metrics = new Map<string, Record<string, string>>();
  for (let page = 1; page <= 10; page++) {
    const data = await tiktokApi<Report>("/report/integrated/get/", { token, query: { advertiser_id: account.advertiserId, report_type: "BASIC", data_level: "AUCTION_CAMPAIGN", dimensions: ["campaign_id"], metrics: ["spend", "impressions", "clicks"], start_date: r.start, end_date: r.end, page, page_size: 1000 } });
    for (const row of data.list || []) if (row.dimensions?.campaign_id) metrics.set(String(row.dimensions.campaign_id), row.metrics || {});
    if (page >= (data.page_info?.total_page || 1)) break;
  }
  const campaigns: Campaign[] = [];
  for (let page = 1; page <= 10; page++) {
    const data = await tiktokApi<{ list?: Campaign[]; page_info?: { total_page?: number } }>("/campaign/get/", { token, query: { advertiser_id: account.advertiserId, page, page_size: 1000, fields: ["campaign_id", "campaign_name", "operation_status", "secondary_status", "budget", "budget_mode"] } });
    campaigns.push(...(data.list || []));
    if (page >= (data.page_info?.total_page || 1)) break;
  }
  const byId = new Map(campaigns.map((c) => [String(c.campaign_id), c]));
  const ids = new Set([...byId.keys(), ...metrics.keys()]);
  return [...ids].map((id) => {
    const c = byId.get(id);
    const m = metrics.get(id) || {};
    const spend = Number(m.spend || 0), impressions = Number(m.impressions || 0), clicks = Number(m.clicks || 0);
    return { id, name: c?.campaign_name || m.campaign_name || `Campanha ${id}`, status: c?.operation_status === "ENABLE" ? "ACTIVE" : "PAUSED", advertiserId: account.advertiserId, account: account.advertiserName, currency: account.currency, budget: c?.budget ?? null, spend, impressions, clicks, cpc: clicks ? spend / clicks : null, ctr: impressions ? (clicks / impressions) * 100 : null, cpm: impressions ? (spend / impressions) * 1000 : null };
  }).filter((item) => item.status === "ACTIVE" || item.spend > 0 || item.impressions > 0);
}

export async function GET(request: Request) {
  try {
    const userId = await requestUserId(request);
    if (!userId) return Response.json({ error: "Não autenticado." }, { status: 401 });
    const requested = new URL(request.url).searchParams.get("period") || "today";
    const period = PERIODS.has(requested) ? requested : "today";
    const r = range(period);
    await ensureDb();
    const db = getDb();
    const accounts = await db.select().from(tiktokAccounts).where(and(eq(tiktokAccounts.userId, userId), eq(tiktokAccounts.selected, 1)));
    const settled = await Promise.allSettled(accounts.map((a) => accountItems(a, r)));
    const items = settled.flatMap((s) => (s.status === "fulfilled" ? s.value : []));
    const failures = settled.flatMap((s, i) => (s.status === "rejected" ? [{ account: accounts[i].advertiserName, error: s.reason instanceof Error ? s.reason.message : "Falha no TikTok" }] : []));

    // Vendas, ICs e visitas do script casadas pelo ID da campanha na UTM.
    const workspaceId = "ws_" + (await sha256(userId)).slice(0, 24);
    const projectIds = (await db.select({ id: projects.id }).from(projects).where(eq(projects.workspaceId, workspaceId))).map((p) => p.id);
    const tracked = projectIds.length ? await db.select({ id: events.id, visitorId: events.visitorId, source: events.source, eventName: events.eventName, utmSource: events.utmSource, utmCampaign: events.utmCampaign, value: events.value, payload: events.payload })
      .from(events).where(and(inArray(events.projectId, projectIds), inArray(events.eventName, ["PageView", "InitiateCheckout", "Purchase", "PaymentPending"]), gte(events.occurredAt, r.from), lte(events.occurredAt, r.to))) : [];
    const testVisitors = await testVisitorIds(db, projectIds);
    const clean = tracked.filter((e) => !isTestEvent(e, testVisitors));
    const matched = buildUtmIndex(clean, (e) => [e.utmCampaign]).matchAll(items, { idOnly: true });
    const unique = (list: { id: string; visitorId: string | null }[]) => new Set(list.map((e) => e.visitorId || e.id)).size;
    const result = items.map((item) => {
      const hit = matched.get(item.id)?.events || [];
      const purchases = hit.filter((e) => e.eventName === "Purchase");
      const pending = hit.filter((e) => e.eventName === "PaymentPending");
      const revenue = purchases.reduce((sum, e) => sum + Number(e.value || 0), 0);
      return { ...item, pageViews: unique(hit.filter((e) => e.eventName === "PageView")), checkouts: unique(hit.filter((e) => e.eventName === "InitiateCheckout")), sales: purchases.length, revenue, pendingSales: pending.length, pendingRevenue: pending.reduce((sum, e) => sum + Number(e.value || 0), 0), profit: revenue - item.spend, roas: item.spend ? revenue / item.spend : null, cpa: purchases.length ? item.spend / purchases.length : null };
    }).sort((a, b) => b.profit - a.profit || b.revenue - a.revenue || b.spend - a.spend);

    // Todas as vendas vindas do TikTok (UTM tiktok ou ttclid), mesmo sem campanha casada.
    const fromTiktok = clean.filter((e) => e.eventName === "Purchase" && (isTiktokSource(e.utmSource) || payloadField(e.payload, "ttclid")));
    const totals = result.reduce((t, i) => ({ spend: t.spend + i.spend, impressions: t.impressions + i.impressions, clicks: t.clicks + i.clicks, sales: t.sales + i.sales, revenue: t.revenue + i.revenue }), { spend: 0, impressions: 0, clicks: 0, sales: 0, revenue: 0 });
    return Response.json({ items: result, period, start: r.start, end: r.end, accounts: accounts.length, failures, totals: { ...totals, profit: totals.revenue - totals.spend, roas: totals.spend ? totals.revenue / totals.spend : null, tiktokSales: fromTiktok.length, tiktokRevenue: fromTiktok.reduce((s, e) => s + Number(e.value || 0), 0) }, updatedAt: new Date().toISOString() }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("TikTok campaigns GET", error);
    return Response.json({ error: error instanceof Error ? error.message : "Falha ao importar dados do TikTok." }, { status: 500 });
  }
}
