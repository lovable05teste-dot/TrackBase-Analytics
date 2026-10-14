import { and, eq, gte, inArray } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { orders, projects } from "@/db/schema";
import { aggregateCustomers } from "@/lib/customers";
import { requestUserId, sha256 } from "@/lib/trackbase-security";

export const dynamic = "force-dynamic";

// Lista de clientes (compradores) do workspace, com compras e receita por cliente.
// Filtros: period (all|7d|30d|this_month) e q (busca por nome, e-mail ou telefone).
export async function GET(request: Request) {
  const userId = await requestUserId(request);
  if (!userId) return Response.json({ error: "Não autenticado." }, { status: 401 });
  await ensureDb();
  const params = new URL(request.url).searchParams;
  const period = params.get("period") || "all";
  const q = (params.get("q") || "").trim().toLowerCase();
  const now = Math.floor(Date.now() / 1000);
  const since = period === "7d" ? now - 7 * 86400 : period === "30d" ? now - 30 * 86400 : period === "this_month" ? Math.floor(Date.parse(new Date().toISOString().slice(0, 8) + "01T00:00:00-03:00") / 1000) : 0;

  const db = getDb();
  const workspaceId = "ws_" + (await sha256(userId)).slice(0, 24);
  const ps = await db.select({ id: projects.id }).from(projects).where(eq(projects.workspaceId, workspaceId));
  if (!ps.length) return Response.json({ customers: [], totals: { customers: 0, revenue: 0, approvedOrders: 0 } });

  const conditions = [inArray(orders.projectId, ps.map((p) => p.id)), inArray(orders.status, ["approved", "pending"])];
  if (since) conditions.push(gte(orders.createdAt, since));
  const rows = await db
    .select({ externalId: orders.externalId, customerEmail: orders.customerEmail, customerName: orders.customerName, customerPhone: orders.customerPhone, status: orders.status, value: orders.value, currency: orders.currency, createdAt: orders.createdAt })
    .from(orders)
    .where(and(...conditions));

  let customers = aggregateCustomers(rows);
  if (q) customers = customers.filter((c) => [c.name, c.email, c.phone].some((v) => v?.toLowerCase().includes(q)));
  const totals = customers.reduce((t, c) => ({ customers: t.customers + 1, revenue: t.revenue + c.revenue, approvedOrders: t.approvedOrders + c.approvedCount }), { customers: 0, revenue: 0, approvedOrders: 0 });
  return Response.json({ customers, totals: { ...totals, revenue: Math.round(totals.revenue * 100) / 100 } }, { headers: { "cache-control": "no-store" } });
}
