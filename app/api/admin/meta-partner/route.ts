import { and, eq, ne } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { metaAccounts, metaPartnerGrants, users } from "@/db/schema";
import { hasConflictingOrigin, isAdminUserId, requestUserId } from "@/lib/trackbase-security";
import { audit, workspaceIdForUser } from "@/lib/permissions";

// Após verificar o compartilhamento na BM, o administrador aprova o cliente.
export async function POST(request: Request) {
  if (hasConflictingOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const admin = await requestUserId(request);
  if (!admin || !(await isAdminUserId(admin))) return Response.json({ error: "Não encontrado." }, { status: 404 });
  const body = await request.json().catch(() => ({})) as { adAccountId?: unknown; userId?: unknown };
  const adAccountId = String(body.adAccountId || "").replace(/^act_/i, "");
  const userId = String(body.userId || "").trim();
  if (!/^\d{5,25}$/.test(adAccountId) || !userId) return Response.json({ error: "Informe ID da conta e ID do usuário." }, { status: 400 });
  await ensureDb();
  const db = getDb();
  if (userId !== "trackbase-owner") {
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return Response.json({ error: "Usuário não encontrado." }, { status: 404 });
  }
  const [taken] = await db.select({ id: metaAccounts.id }).from(metaAccounts).where(and(eq(metaAccounts.adAccountId, adAccountId), eq(metaAccounts.metaUserId, "partner"), ne(metaAccounts.userId, userId))).limit(1);
  if (taken) return Response.json({ error: "Conta já vinculada a outro cliente. Revise antes de transferir." }, { status: 409 });
  await db.insert(metaPartnerGrants).values({ adAccountId, userId, approvedBy: admin, createdAt: Math.floor(Date.now() / 1000) }).onConflictDoNothing();
  const [grant] = await db.select().from(metaPartnerGrants).where(eq(metaPartnerGrants.adAccountId, adAccountId)).limit(1);
  if (grant?.userId !== userId) return Response.json({ error: "Conta aprovada para outro cliente." }, { status: 409 });
  await audit(await workspaceIdForUser(userId), admin, "meta.partner.approved", "ad_account", adAccountId);
  return Response.json({ approved: true, adAccountId, userId });
}
