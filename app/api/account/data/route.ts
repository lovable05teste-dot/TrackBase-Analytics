import { desc, eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { members, planSubscriptions, users, workspaces } from "@/db/schema";
import { getEffectivePlan, type PlanId } from "@/lib/plans";
import { requestUserId, sha256 } from "@/lib/trackbase-security";

export async function GET(request: Request) {
  await ensureDb();
  const userId = await requestUserId(request);
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });
  if (userId === "trackbase-owner") {
    return Response.json({
      userName: "Administrador",
      userEmail: "admin@trackbase.local",
      workspaceName: "GhostScale Admin",
      planName: "Scale",
      planStatus: "active",
      avatarInitial: "A",
    });
  }
  const db = getDb();
  const [user] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return Response.json({ error: "Usuário não encontrado" }, { status: 404 });
  const workspaceId = "ws_" + (await sha256(userId)).slice(0, 24);
  const [ws] = await db.select({ name: workspaces.name }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  const rows = await db.select().from(planSubscriptions).where(eq(planSubscriptions.workspaceId, workspaceId)).orderBy(desc(planSubscriptions.createdAt)).limit(1);
  const sub = rows[0];
  let planName = "—";
  let planStatus = "inactive";
  if (sub && sub.status === "active") {
    const eff = getEffectivePlan(sub.plan as PlanId, (sub as { planVersion?: number | null }).planVersion ?? 1);
    planName = eff.name;
    planStatus = "active";
  } else if (sub && sub.status === "past_due") {
    const eff = getEffectivePlan(sub.plan as PlanId, (sub as { planVersion?: number | null }).planVersion ?? 1);
    planName = eff.name;
    planStatus = "past_due";
  } else if (sub && sub.status === "canceled") {
    planStatus = "canceled";
  } else if (sub && sub.status === "paused") {
    planStatus = "paused";
  } else {
    planStatus = "demo";
  }
  return Response.json({
    userName: user.name || user.email.split("@")[0],
    userEmail: user.email,
    workspaceName: ws?.name || `GhostScale de ${user.name || user.email.split("@")[0]}`,
    planName,
    planStatus,
    avatarInitial: (user.name || user.email.split("@")[0]).charAt(0).toUpperCase(),
  });
}