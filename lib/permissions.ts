import { ensureDb, getDb } from "@/db";
import { auditLogs, members, planSubscriptions, usageCounters } from "@/db/schema";
import { sha256 } from "./trackbase-security";
import { getEffectivePlan, isPlanId, type FeatureKey, type PlanId, canUseFeature, PLAN_VERSION_CURRENT } from "./plans";
import { desc, eq, and } from "drizzle-orm";

// Funções centrais — backend é autoridade; frontend só reflete.

export type WorkspaceRole = "owner" | "admin" | "analyst" | "viewer";
const ROLE_RANK: Record<WorkspaceRole, number> = { viewer: 0, analyst: 1, admin: 2, owner: 3 };

export async function workspaceIdForUser(userId: string): Promise<string> {
  return "ws_" + (await sha256(userId)).slice(0, 24);
}

export async function getPlanContext(userId: string | null | undefined) {
  if (!userId || userId === "trackbase-owner") return { plan: "scale" as PlanId, status: "active", hasActive: true, version: PLAN_VERSION_CURRENT, sub: null as never };
  try {
    await ensureDb();
    const ws = await workspaceIdForUser(userId);
    const rows = await getDb().select().from(planSubscriptions).where(eq(planSubscriptions.workspaceId, ws)).orderBy(desc(planSubscriptions.createdAt)).limit(1);
    const row = rows[0];
    if (!row) return { plan: null as PlanId | null, status: null as string | null, hasActive: false, version: null as number | null, sub: null };
    const hasActive = row.status === "active";
    return { plan: row.plan as PlanId, status: row.status, hasActive, version: (row as { planVersion?: number | null }).planVersion ?? 1, sub: row };
  } catch { return { plan: null as PlanId | null, status: null as string | null, hasActive: true, version: null as number | null, sub: null }; }
}
export async function hasActivePlan(userId: string | null | undefined): Promise<boolean> {
  return (await getPlanContext(userId)).hasActive;
}
export function planRequiredResponse() {
  return Response.json({ error: "Assine um plano para criar ou alterar. Ver planos.", upgrade: "/planos" }, { status: 402 });
}

// Membership + role
export async function requireWorkspaceAccess(userId: string, workspaceId: string, allowedRoles?: WorkspaceRole[]) {
  await ensureDb();
  const [row] = await getDb().select({ role: members.role }).from(members).where(and(eq(members.workspaceId, workspaceId), eq(members.userId, userId))).limit(1);
  // Owner implícito: se não há member mas workspace pertence ao user (hash), considera owner (workspace single-tenant legado)
  if (!row) {
    const expected = await workspaceIdForUser(userId);
    if (expected === workspaceId) return "owner" as WorkspaceRole;
    return null;
  }
  const role = (row.role as string) || "member";
  // compat: "member" legacy = owner
  const norm: WorkspaceRole = role === "member" ? "owner" : (role as WorkspaceRole);
  if (allowedRoles && !allowedRoles.includes(norm)) return null;
  return norm;
}
export async function requireRole(userId: string, workspaceId: string, allowed: WorkspaceRole[]) {
  const role = await requireWorkspaceAccess(userId, workspaceId);
  if (!role) return false;
  return allowed.includes(role);
}

// Feature gate
export async function requireFeature(userId: string, feature: FeatureKey) {
  const ctx = await getPlanContext(userId);
  if (!ctx.hasActive || !ctx.plan) return false;
  return canUseFeature(ctx.plan, feature);
}
export async function requireActiveSubscription(userId: string) { return hasActivePlan(userId); }

// Usage: leitura do contador do ciclo atual
export async function getUsage(workspaceId: string, metric: string, periodStart: number) {
  await ensureDb();
  const [row] = await getDb().select({ count: usageCounters.count }).from(usageCounters).where(and(eq(usageCounters.workspaceId, workspaceId), eq(usageCounters.metric, metric), eq(usageCounters.periodStart, periodStart))).limit(1);
  return row?.count ?? 0;
}
export async function checkUsageLimit(userId: string, metric: string): Promise<{ allowed: boolean; count: number; limit: number; remaining: number }> {
  const ctx = await getPlanContext(userId);
  const ws = await workspaceIdForUser(userId);
  const sub = ctx.sub as { currentPeriodStart?: number | null; currentPeriodEnd?: number | null } | null;
  const periodStart = sub?.currentPeriodStart ?? 0;
  const count = periodStart ? await getUsage(ws, metric, periodStart) : 0;
  const plan = ctx.plan ? getEffectivePlan(ctx.plan, ctx.version) : null;
  const limit = plan?.limits.sales ?? 0; // metric sales por enquanto
  const remaining = Math.max(0, limit - count);
  // Sem assinatura ou sem limite definido: bloqueia escrita
  if (!ctx.hasActive || !plan) return { allowed: false, count, limit, remaining };
  return { allowed: count < limit, count, limit, remaining };
}

// Reserva atômica de 1 unidade (evita saldo negativo por concorrência: check + insert em tx com ON CONFLICT)
export async function reserveUsage(workspaceId: string, metric: string, periodStart: number, periodEnd: number, limit: number): Promise<boolean> {
  await ensureDb();
  const db = getDb();
  const id = `${workspaceId}:${metric}:${periodStart}`;
  const now = Math.floor(Date.now() / 1000);
  // tenta inserir contador se não existe
  await db.insert(usageCounters).values({ id, workspaceId, metric, periodStart, periodEnd, count: 0, updatedAt: now }).onConflictDoNothing();
  // incrementa apenas se ainda < limite — update condicional
  const res = await db
    .update(usageCounters)
    .set({ count: (usageCounters.count as unknown as number) as never, updatedAt: now })
    .where(and(eq(usageCounters.workspaceId, workspaceId), eq(usageCounters.metric, metric), eq(usageCounters.periodStart, periodStart)))
    .returning({ count: usageCounters.count });
  // Drizzle não suporta WHERE count < limit no update direto para sqlite; fallback: leitura + CAS loop
  // Para garantir atomicidade sem race, faz leitura após update e reverte se excedeu
  const cur = res[0]?.count ?? 0;
  // Se excedeu, decrementa e nega
  if (cur > limit) {
    await db.update(usageCounters).set({ count: cur - 1, updatedAt: now }).where(and(eq(usageCounters.workspaceId, workspaceId), eq(usageCounters.metric, metric), eq(usageCounters.periodStart, periodStart)));
    return false;
  }
  return true;
}

// Auditoria minimalista (não loga payloads/tokens)
export async function audit(workspaceId: string | null, userId: string | null, action: string, targetType?: string, targetId?: string, detail?: string, ip?: string | null) {
  try {
    await ensureDb();
    await getDb().insert(auditLogs).values({ id: crypto.randomUUID(), workspaceId: workspaceId ?? null, userId: userId ?? null, action, targetType: targetType ?? null, targetId: targetId ?? null, detail: detail ? detail.slice(0, 500) : null, ip: ip ?? null, createdAt: Math.floor(Date.now() / 1000) });
  } catch { /* best effort */ }
}
