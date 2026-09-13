import { desc, eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { planSubscriptions, orders } from "@/db/schema";
import { requestUserId, sha256 } from "@/lib/trackbase-security";
import { plansCatalog, getEffectivePlan, type PlanId } from "@/lib/plans";
import { inArray } from "drizzle-orm";

export async function GET(request: Request) {
  await ensureDb();
  const userId = await requestUserId(request);
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const workspaceId = "ws_" + (await sha256(userId)).slice(0, 24);
  const db = getDb();
  const rows = await db.select().from(planSubscriptions).where(eq(planSubscriptions.workspaceId, workspaceId)).orderBy(desc(planSubscriptions.createdAt)).limit(10);
  const sub = rows[0] as (typeof rows)[number] & { planVersion?: number | null; currentPeriodStart?: number | null; currentPeriodEnd?: number | null; excessEnabled?: number | null; excessCap?: number | null; scheduledPlan?: string | null } | undefined;
  let usage: { count: number; limit: number; pct: number; remaining: number } | null = null;
  if (sub && sub.status === "active") {
    const eff = getEffectivePlan(sub.plan as PlanId, sub.planVersion);
    const limit = eff.limits.sales;
    // conta vendas aprovadas no ciclo atual (periodStart -> periodEnd ou agora)
    const start = sub.currentPeriodStart ?? sub.createdAt;
    // busca projects do workspace para filtrar orders por projeto
    try {
      const { projects } = await import("@/db/schema");
      const ps = await db.select({ id: projects.id }).from(projects).where(eq(projects.workspaceId, workspaceId));
      if (ps.length) {
        const o = await db.select().from(orders).where(inArray(orders.projectId, ps.map((p) => p.id)));
        const approved = o.filter((r) => r.status === "approved" && r.createdAt >= start);
        const count = approved.length;
        usage = { count, limit, pct: limit ? Math.min(100, Math.round((count / limit) * 100)) : 0, remaining: Math.max(0, limit - count) };
      } else usage = { count: 0, limit, pct: 0, remaining: limit };
    } catch { usage = { count: 0, limit, pct: 0, remaining: limit }; }
  }
  const current = sub
    ? {
        plan: sub.plan, planVersion: sub.planVersion ?? 1, status: sub.status, amount: sub.amount, currency: sub.currency,
        currentPeriodStart: sub.currentPeriodStart ?? null, currentPeriodEnd: sub.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd), excessEnabled: Boolean(sub.excessEnabled), excessCap: sub.excessCap ?? null,
        scheduledPlan: sub.scheduledPlan ?? null, updatedAt: sub.updatedAt,
      }
    : null;
  return Response.json({ subscription: current, usage, plans: plansCatalog(), sdkClientId: (process.env.NEXT_PUBLIC_CAKTO_CLIENT_ID || "").trim() ? true : false });
}
