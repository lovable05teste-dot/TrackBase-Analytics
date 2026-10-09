import { cache } from "react";
import { eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { users, workspaces } from "@/db/schema";
import { getEffectivePlan, type PlanId } from "@/lib/plans";
import { getPlanContext } from "@/lib/permissions";
import { getUserIdFromSessionCookie, sha256, currentSessionTokens } from "@/lib/trackbase-security";

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
// Nome, e-mail e papel do usuário, lidos uma vez por requisição e
// compartilhados entre o cabeçalho (getChatGPTUser) e os dados da conta.
export const getUserProfile = cache(async (userId: string) => {
  await ensureDb();
  const [row] = await getDb().select({ name: users.name, email: users.email, role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  return row ?? null;
});

async function getAccountDataUncached(userId: string | null | undefined): Promise<AccountData> {
  if (!userId) return EMPTY_ACCOUNT;
  if (userId === "trackbase-owner") return ADMIN_ACCOUNT;

  try {
    await ensureDb();
    const db = getDb();
    const workspaceId = "ws_" + (await sha256(userId)).slice(0, 24);
    // As três leituras são independentes: em paralelo, não em fila.
    const [user, [workspace], [subscription]] = await Promise.all([
      getUserProfile(userId),
      db.select({ name: workspaces.name }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1),
      // Mesma leitura do plano que o menu e as permissões já fazem.
      getPlanContext(userId).then((ctx) => [ctx.sub as { plan: string; planVersion: number | null; status: string } | null].filter(Boolean)),
    ]);

    if (!user?.email) return EMPTY_ACCOUNT;

    const displayName = user.name?.trim() || user.email.split("@")[0] || "Usuário";

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

// Dados da conta lidos uma vez por requisição (layout e menu pediam de novo).
export const getAccountData = cache(getAccountDataUncached);

export async function getCurrentAccountData(identity?: { displayName?: string | null; email?: string | null }): Promise<AccountData> {
  const token = await currentSessionTokens();
  const account = await getAccountData(await getUserIdFromSessionCookie(token));
  return account.userEmail || !identity ? account : accountDataFromIdentity(identity);
}
