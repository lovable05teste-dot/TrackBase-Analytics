import { desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { ensureDb, getDb } from "@/db";
import { planSubscriptions, users, workspaces } from "@/db/schema";
import { getEffectivePlan, type PlanId } from "@/lib/plans";
import { getUserIdFromSessionCookie, sha256 } from "@/lib/trackbase-security";

export type AccountData = {
  userName: string;
  userEmail: string;
  workspaceName: string;
  planName: string;
  planStatus: string;
  avatarInitial: string;
  isAdmin: boolean;
};

export const EMPTY_ACCOUNT: AccountData = {
  userName: "Usuário",
  userEmail: "",
  workspaceName: "",
  planName: "—",
  planStatus: "demo",
  avatarInitial: "U",
  isAdmin: false,
};

export function accountDataFromIdentity(identity: { displayName?: string | null; email?: string | null }): AccountData {
  const email = identity.email?.trim() || "";
  const userName = identity.displayName?.trim() || email.split("@")[0] || "Usuário";
  return {
    ...EMPTY_ACCOUNT,
    userName,
    userEmail: email,
    avatarInitial: userName.charAt(0).toUpperCase(),
  };
}

const ADMIN_ACCOUNT: AccountData = {
  userName: "Administrador",
  userEmail: "admin@trackbase.local",
  workspaceName: "GhostScale Admin",
  planName: "Scale",
  planStatus: "active",
  avatarInitial: "A",
  isAdmin: true,
};

/**
 * Resolves the account from the authenticated user id only.  Workspace names
 * and roles are deliberately omitted for regular users; they are admin
 * context, not part of the end-user profile.
 */
export async function getAccountData(userId: string | null | undefined): Promise<AccountData> {
  if (!userId) return EMPTY_ACCOUNT;
  if (userId === "trackbase-owner") return ADMIN_ACCOUNT;

  try {
    await ensureDb();
    const db = getDb();
    const [user] = await db
      .select({ name: users.name, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user?.email) return EMPTY_ACCOUNT;

    const displayName = user.name?.trim() || user.email.split("@")[0] || "Usuário";
    const workspaceId = "ws_" + (await sha256(userId)).slice(0, 24);
    const [workspace] = await db
      .select({ name: workspaces.name })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);
    const [subscription] = await db
      .select({
        plan: planSubscriptions.plan,
        planVersion: planSubscriptions.planVersion,
        status: planSubscriptions.status,
      })
      .from(planSubscriptions)
      .where(eq(planSubscriptions.workspaceId, workspaceId))
      .orderBy(desc(planSubscriptions.createdAt))
      .limit(1);

    let planName = "—";
    let planStatus = "demo";
    if (subscription) {
      if (["active", "past_due"].includes(subscription.status)) {
        const effective = getEffectivePlan(
          subscription.plan as PlanId,
          subscription.planVersion ?? 1,
        );
        planName = effective.name;
        planStatus = subscription.status;
      } else if (["canceled", "paused"].includes(subscription.status)) {
        planStatus = subscription.status;
      }
    }

    const isAdmin = user.role === "admin";
    return {
      userName: displayName,
      userEmail: user.email,
      workspaceName: isAdmin ? workspace?.name || "GhostScale Admin" : "",
      planName,
      planStatus,
      avatarInitial: displayName.charAt(0).toUpperCase(),
      isAdmin,
    };
  } catch (error) {
    // A temporary database/provider issue should not turn every private route
    // into the generic Next error page or expose another user's data.
    console.error("account profile lookup", error);
    return EMPTY_ACCOUNT;
  }
}

export async function getCurrentAccountData(identity?: { displayName?: string | null; email?: string | null }): Promise<AccountData> {
  const token = (await cookies()).get("tb_session")?.value;
  const account = await getAccountData(await getUserIdFromSessionCookie(token));
  return account.userEmail || !identity ? account : accountDataFromIdentity(identity);
}
