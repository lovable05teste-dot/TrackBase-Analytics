import { eq, inArray } from "drizzle-orm";
import {
  actionHistory, apiCredentials, auditLogs, automationRules, capiOutbox, emailVerifications, events,
  loginAttempts, members, metaAccounts, metaConnectLinks, metaLinked, metaOauthStates, monitorChecks, nativePushTokens,
  notificationPrefs, orders, passwordResets, projects, protectionReports, pushSubscriptions, sessions, siteMonitors,
  siteProtections, soundPrefs, tiktokAccounts, toolStates, usageCounters, users, verificationCodes, workspaces,
} from "@/db/schema";

type Db = ReturnType<typeof import("@/db").getDb>;

// Apaga tudo que é do usuário: projetos (com vendas, eventos e credenciais),
// monitores, contas de anúncio, sessões e a própria conta. Os registros de
// assinatura (plan_subscriptions) ficam: a lei fiscal exige guardá-los.
export async function deleteUserAccount(db: Db, userId: string, workspaceId: string) {
  const ps = await db.select({ id: projects.id }).from(projects).where(eq(projects.workspaceId, workspaceId));
  const projectIds = ps.map((p) => p.id);
  const monitors = await db.select({ id: siteMonitors.id }).from(siteMonitors).where(eq(siteMonitors.workspaceId, workspaceId));
  const monitorIds = monitors.map((m) => m.id);
  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);

  await db.transaction(async (tx) => {
    if (projectIds.length) {
      await tx.delete(events).where(inArray(events.projectId, projectIds));
      await tx.delete(orders).where(inArray(orders.projectId, projectIds));
      await tx.delete(apiCredentials).where(inArray(apiCredentials.projectId, projectIds));
      await tx.delete(protectionReports).where(inArray(protectionReports.projectId, projectIds));
      await tx.delete(siteProtections).where(inArray(siteProtections.projectId, projectIds));
      await tx.delete(capiOutbox).where(inArray(capiOutbox.projectId, projectIds));
      await tx.delete(projects).where(inArray(projects.id, projectIds));
    }
    if (monitorIds.length) await tx.delete(monitorChecks).where(inArray(monitorChecks.monitorId, monitorIds));
    await tx.delete(siteMonitors).where(eq(siteMonitors.workspaceId, workspaceId));
    await tx.delete(siteProtections).where(eq(siteProtections.workspaceId, workspaceId));
    await tx.delete(toolStates).where(eq(toolStates.workspaceId, workspaceId));
    await tx.delete(automationRules).where(eq(automationRules.workspaceId, workspaceId));
    await tx.delete(actionHistory).where(eq(actionHistory.workspaceId, workspaceId));
    await tx.delete(usageCounters).where(eq(usageCounters.workspaceId, workspaceId));
    await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.workspaceId, workspaceId));
    await tx.delete(nativePushTokens).where(eq(nativePushTokens.workspaceId, workspaceId));
    await tx.delete(notificationPrefs).where(eq(notificationPrefs.workspaceId, workspaceId));
    await tx.delete(soundPrefs).where(eq(soundPrefs.workspaceId, workspaceId));
    await tx.delete(capiOutbox).where(eq(capiOutbox.workspaceId, workspaceId));
    await tx.delete(members).where(eq(members.workspaceId, workspaceId));
    await tx.delete(workspaces).where(eq(workspaces.id, workspaceId));
    await tx.delete(metaAccounts).where(eq(metaAccounts.userId, userId));
    await tx.delete(metaLinked).where(eq(metaLinked.userId, userId));
    await tx.delete(metaConnectLinks).where(eq(metaConnectLinks.userId, userId));
    await tx.delete(metaOauthStates).where(eq(metaOauthStates.userId, userId));
    await tx.delete(tiktokAccounts).where(eq(tiktokAccounts.userId, userId));
    await tx.delete(passwordResets).where(eq(passwordResets.userId, userId));
    await tx.delete(emailVerifications).where(eq(emailVerifications.userId, userId));
    await tx.delete(verificationCodes).where(eq(verificationCodes.userId, userId));
    if (user?.email) await tx.delete(loginAttempts).where(eq(loginAttempts.email, user.email));
    await tx.delete(auditLogs).where(eq(auditLogs.userId, userId));
    await tx.delete(sessions).where(eq(sessions.userId, userId));
    await tx.delete(users).where(eq(users.id, userId));
  });
}
