import { and, count, eq, gte, inArray, not, sum } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { ensureDb, getDb } from "@/db";
import { events, orders, projects } from "@/db/schema";
import { requestUserId, sha256 } from "@/lib/trackbase-security";

export async function getWorkspace() {
  const forwarded = new Headers();
  for (const [key, value] of (await headers()).entries()) forwarded.set(key, value);
  const cookieValue = (await cookies()).toString();
  if (cookieValue) forwarded.set("cookie", cookieValue);
  const userId = await requestUserId(new Request("http://trackbase.local", { headers: forwarded }));
  const workspaceId = userId ? "ws_" + (await sha256(userId)).slice(0, 24) : null;
  return { userId, workspaceId };
}

export async function getProjectIds(workspaceId: string | null) {
  if (!workspaceId) return { rows: [], ids: [] as string[] };
  await ensureDb();
  const rows = await getDb()
    .select({ id: projects.id, name: projects.name, domain: projects.domain, publicKey: projects.publicKey })
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId));
  return { rows, ids: rows.map((p) => p.id) };
}

export type TrackEvent = {
  eventName: string;
  value: number;
  occurredAt: number;
  visitorId: string | null;
  fbclid: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  utmMedium: string | null;
  utmContent: string | null;
  utmTerm: string | null;
};

export async function getEvents(ids: string[], since: number | null): Promise<TrackEvent[]> {
  if (!ids.length) return [];
  await ensureDb();
  const conds = [inArray(events.projectId, ids), not(inArray(events.eventName, ["Click", "Scroll", "InvalidTraffic"]))];
  if (since) conds.push(gte(events.occurredAt, since));
  const rows = await getDb()
    .select({
      eventName: events.eventName,
      value: events.value,
      occurredAt: events.occurredAt,
      visitorId: events.visitorId,
      fbclid: events.fbclid,
      utmSource: events.utmSource,
      utmCampaign: events.utmCampaign,
      utmMedium: events.utmMedium,
      utmContent: events.utmContent,
      utmTerm: events.utmTerm,
    })
    .from(events)
    .where(and(...conds));
  return rows.map((r) => ({ ...r, value: Number(r.value ?? 0) }));
}

export async function getEventPayloads(ids: string[], since: number | null, names: string[], limit = 5000): Promise<Array<{ eventName: string; occurredAt: number; payload: Record<string, unknown> }>> {
  if (!ids.length) return [];
  await ensureDb();
  const conds = [inArray(events.projectId, ids), inArray(events.eventName, names)];
  if (since) conds.push(gte(events.occurredAt, since));
  const rows = await getDb()
    .select({ eventName: events.eventName, occurredAt: events.occurredAt, payload: events.payload })
    .from(events)
    .where(and(...conds));
  return rows.slice(-limit).map((r) => {
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(r.payload || "{}");
    } catch {}
    return { eventName: r.eventName, occurredAt: r.occurredAt, payload };
  });
}

export async function getEventTotals(ids: string[], since: number | null) {
  const list = await getEvents(ids, since);
  const byName = new Map<string, number>();
  let revenue = 0;
  for (const e of list) {
    byName.set(e.eventName, (byName.get(e.eventName) ?? 0) + 1);
    if (e.eventName === "Purchase") revenue += e.value;
  }
  return { byName, revenue };
}

export async function getOrdersSummary(ids: string[], since: number | null) {
  if (!ids.length) return { byStatus: new Map<string, { n: number; v: number }>(), total: 0, totalValue: 0 };
  await ensureDb();
  const db = getDb();
  const conds = [inArray(orders.projectId, ids)];
  if (since) conds.push(gte(orders.createdAt, since));
  const rows = await db
    .select({ status: orders.status, n: count(), v: sum(orders.value) })
    .from(orders)
    .where(and(...conds))
    .groupBy(orders.status);
  const byStatus = new Map<string, { n: number; v: number }>();
  let total = 0;
  let totalValue = 0;
  for (const r of rows) {
    const n = Number(r.n);
    const v = Number(r.v ?? 0);
    byStatus.set(r.status, { n, v });
    total += n;
    totalValue += v;
  }
  return { byStatus, total, totalValue };
}

const UTM_KEYS = {
  utm_source: "utmSource",
  utm_campaign: "utmCampaign",
  utm_medium: "utmMedium",
  utm_content: "utmContent",
  utm_term: "utmTerm",
} as const;

export async function getUtmBreakdown(ids: string[], since: number | null, field: keyof typeof UTM_KEYS, limit = 50) {
  const list = await getEvents(ids, since);
  const key = UTM_KEYS[field];
  const map = new Map<string, { name: string; cliques: number; views: number; ics: number; compras: number; receita: number }>();
  for (const e of list) {
    const name = (e[key] || "").trim();
    if (!name) continue;
    const row = map.get(name) ?? { name, cliques: 0, views: 0, ics: 0, compras: 0, receita: 0 };
    if (e.eventName === "AdClick") row.cliques += 1;
    else if (e.eventName === "PageView") row.views += 1;
    else if (e.eventName === "InitiateCheckout") row.ics += 1;
    else if (e.eventName === "Purchase") { row.compras += 1; row.receita += e.value; }
    map.set(name, row);
  }
  return [...map.values()].sort((a, b) => b.compras - a.compras || b.cliques - a.cliques).slice(0, limit);
}

export const brl = (v: number, currency = "BRL") => {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(v || 0);
  } catch {
    return `R$ ${Number(v || 0).toFixed(2)}`;
  }
};

export const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
