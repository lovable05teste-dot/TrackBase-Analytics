import { and, eq, ne } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { metaAccounts } from "@/db/schema";
import { assignToSystemUser, PARTNER_LOGIN_ID, partnerConfig, readPartnerAccount } from "@/lib/meta-partner";
import { encryptSecret, hasActivePlan, hasConflictingOrigin, planRequiredResponse, requestUserId, sha256 } from "@/lib/trackbase-security";

export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

export async function GET(request: Request) {
  const userId = await requestUserId(request);
  if (!userId) return json({ error: "Não autenticado" }, 401);
  const { businessId, configured } = partnerConfig();
  return json({ configured, businessId: configured ? businessId : null });
}

// Adiciona uma conta compartilhada com a BM da GhostScale pelo ID dela.
export async function POST(request: Request) {
  if (hasConflictingOrigin(request)) return json({ error: "Origem inválida." }, 403);
  const userId = await requestUserId(request);
  if (!userId) return json({ error: "Não autenticado" }, 401);
  if (!(await hasActivePlan(userId))) return planRequiredResponse();
  const config = partnerConfig();
  if (!config.configured) return json({ error: "Conexão por parceiro ainda não ativada no servidor." }, 503);
  const body = (await request.json().catch(() => ({}))) as { adAccountId?: unknown };
  const adAccountId = String(body.adAccountId || "").replace(/^act_/i, "").replace(/\D/g, "");
  if (!/^\d{5,25}$/.test(adAccountId)) return json({ error: "Cole o ID da conta de anúncios (só números, ex.: 1234567890)." }, 400);
  await ensureDb();
  const db = getDb();
  // Uma conta pertence a um único usuário da GhostScale.
  const [taken] = await db.select({ id: metaAccounts.id }).from(metaAccounts).where(and(eq(metaAccounts.adAccountId, adAccountId), eq(metaAccounts.metaUserId, PARTNER_LOGIN_ID), ne(metaAccounts.userId, userId))).limit(1);
  if (taken) return json({ error: "Essa conta já foi adicionada por outro usuário. Fale com o suporte se ela for sua." }, 409);
  let account;
  try {
    account = await readPartnerAccount(adAccountId, config.token);
  } catch {
    try {
      await assignToSystemUser(adAccountId, config.token, config.businessId);
      account = await readPartnerAccount(adAccountId, config.token);
    } catch {
      return json({ error: `Ainda não recebemos acesso à conta ${adAccountId}. Compartilhe a conta com o portfólio ${config.businessId} (passo 1) e tente de novo em 1 minuto.` }, 400);
    }
  }
  // Contas da própria BM da GhostScale não são de cliente: nunca liberar.
  if (account.business?.id === config.businessId) return json({ error: "Essa conta não pode ser adicionada por parceiro." }, 403);
  const now = Math.floor(Date.now() / 1000);
  const secured = await encryptSecret(config.token);
  const workspaceId = "ws_" + (await sha256(userId)).slice(0, 24);
  const name = account.name || `Conta ${adAccountId}`;
  await db.insert(metaAccounts).values({ id: crypto.randomUUID(), workspaceId, userId, metaUserId: PARTNER_LOGIN_ID, metaUserName: "Acesso de parceiro", adAccountId, accountName: name, currency: account.currency || null, timezoneName: account.timezone_name || null, accountStatus: account.account_status ?? null, accessTokenCipher: secured.cipher, accessTokenIv: secured.iv, tokenExpiresAt: null, selected: 0, connectedAt: now, updatedAt: now })
    .onConflictDoUpdate({ target: [metaAccounts.userId, metaAccounts.adAccountId], set: { metaUserId: PARTNER_LOGIN_ID, metaUserName: "Acesso de parceiro", accountName: name, currency: account.currency || null, timezoneName: account.timezone_name || null, accountStatus: account.account_status ?? null, accessTokenCipher: secured.cipher, accessTokenIv: secured.iv, tokenExpiresAt: null, updatedAt: now } });
  // Se o token do sistema foi trocado, atualiza as outras contas de parceiro do usuário.
  await db.update(metaAccounts).set({ accessTokenCipher: secured.cipher, accessTokenIv: secured.iv, updatedAt: now }).where(and(eq(metaAccounts.userId, userId), eq(metaAccounts.metaUserId, PARTNER_LOGIN_ID)));
  return json({ added: true, account: { adAccountId, name } });
}
