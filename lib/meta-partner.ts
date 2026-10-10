import { metaConfig, metaJson } from "@/lib/meta";

// Acesso de parceiro: o cliente compartilha a conta de anúncios com o
// portfólio (BM) da GhostScale e lemos tudo com o token do usuário do sistema
// da própria BM. Não depende de login do Facebook nem de app aprovado.
export const PARTNER_LOGIN_ID = "partner";

export function partnerConfig() {
  const token = process.env.META_SYSTEM_USER_TOKEN?.trim() || "";
  const businessId = process.env.META_PARTNER_BUSINESS_ID?.trim() || "";
  return { token, businessId, configured: Boolean(token && businessId) };
}

type Account = { account_id: string; name?: string; currency?: string; timezone_name?: string; account_status?: number; business?: { id?: string } };

export async function readPartnerAccount(adAccountId: string, token: string) {
  const { version } = metaConfig();
  const url = new URL(`https://graph.facebook.com/${version}/act_${adAccountId}`);
  url.searchParams.set("fields", "account_id,name,currency,timezone_name,account_status,business");
  url.searchParams.set("access_token", token);
  return metaJson<Account>(url.toString());
}

// Conta recém-compartilhada aparece na BM, mas o usuário do sistema ainda
// não tem acesso: atribuímos via API (precisa ser usuário do sistema admin).
export async function assignToSystemUser(adAccountId: string, token: string, businessId: string) {
  const { version } = metaConfig();
  const me = await metaJson<{ id: string }>(`https://graph.facebook.com/${version}/me?fields=id&access_token=${encodeURIComponent(token)}`);
  const body = new URLSearchParams({ user: me.id, tasks: JSON.stringify(["MANAGE", "ADVERTISE", "ANALYZE"]), business: businessId, access_token: token });
  await metaJson(`https://graph.facebook.com/${version}/act_${adAccountId}/assigned_users`, { method: "POST", body });
}
