import { and, count, eq, gte, inArray, sql, sum } from "drizzle-orm";
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

export async function getEventTotals(ids: string[], since: number | null) {
  if (!ids.length) return { byName: new Map<string, number>(), revenue: 0 };
  await ensureDb();
  const db = getDb();
  const conds = [inArray(events.projectId, ids)];
  if (since) conds.push(gte(events.occurredAt, since));
  const rows = await db
    .select({ eventName: events.eventName, n: count(), v: sum(events.value) })
    .from(events)
    .where(and(...conds))
    .groupBy(events.eventName);
  const byName = new Map<string, number>();
  let revenue = 0;
  for (const r of rows) {
    byName.set(r.eventName, Number(r.n));
    if (r.eventName === "Purchase") revenue += Number(r.v ?? 0);
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

export async function getUtmBreakdown(ids: string[], since: number | null, field: "utm_source" | "utm_campaign" | "utm_medium" | "utm_content" | "utm_term", limit = 50) {
  if (!ids.length) return [];
  await ensureDb();
  const rows = await getDb().execute(sql`
    SELECT ${sql.identifier(field)} AS name, event_name, COUNT(*)::int AS n, COALESCE(SUM(value),0)::float AS revenue
    FROM events
    WHERE project_id = ANY(${ids}) AND ${sql.identifier(field)} IS NOT NULL AND ${sql.identifier(field)} <> '' AND occurred_at >= ${since ?? 0}
    GROUP BY ${sql.identifier(field)}, event_name
    ORDER BY n DESC LIMIT ${limit * 5}
  `);
  const map = new Map<string, { name: string; cliques: number; views: number; ics: number; compras: number; receita: number }>();
  for (const r of rows as unknown as { name: string; event_name: string; n: number; revenue: number }[]) {
    const e = map.get(r.name) ?? { name: r.name, cliques: 0, views: 0, ics: 0, compras: 0, receita: 0 };
    if (r.event_name === "AdClick") e.cliques += Number(r.n);
    else if (r.event_name === "PageView") e.views += Number(r.n);
    else if (r.event_name === "InitiateCheckout") e.ics += Number(r.n);
    else if (r.event_name === "Purchase") { e.compras += Number(r.n); e.receita += Number(r.revenue ?? 0); }
    map.set(r.name, e);
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
