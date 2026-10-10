import { and, eq, gte } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { metaOauthStates, tiktokAccounts } from "@/db/schema";
import { requireTiktokConfig, tiktokApi } from "@/lib/tiktok";
import { encryptSecret, requestUserId, sha256 } from "@/lib/trackbase-security";

export const dynamic = "force-dynamic";

type TokenData = { access_token: string; advertiser_ids?: string[] };
type AdvertiserList = { list?: { advertiser_id: string; advertiser_name?: string }[] };
type AdvertiserInfo = { advertiser_id: string; name?: string; currency?: string; timezone?: string }[] | { list?: { advertiser_id: string; name?: string; currency?: string; timezone?: string }[] };

export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const state = incoming.searchParams.get("state") || "";
  const code = incoming.searchParams.get("auth_code") || incoming.searchParams.get("code") || "";
  const viaLink = state.startsWith("l");
  const go = (query: string) => Response.redirect(new URL(`${viaLink ? "/meta-conectado?p=tiktok&" : "/tiktok?"}${query}`, request.url), 302);
  if (!state) return go("erro=retorno");
  if (!code) return go("erro=cancelado");
  try {
    await ensureDb();
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    const [valid] = await db.delete(metaOauthStates)
      .where(and(eq(metaOauthStates.stateHash, await sha256(`tiktok:${state}`)), gte(metaOauthStates.expiresAt, now)))
      .returning({ userId: metaOauthStates.userId });
    if (!valid) throw new Error("STATE_INVALID");
    const cookieUserId = await requestUserId(request);
    if (cookieUserId && cookieUserId !== valid.userId) throw new Error("STATE_INVALID");
    const userId = valid.userId;
    const config = requireTiktokConfig();
    const token = await tiktokApi<TokenData>("/oauth2/access_token/", { body: { app_id: config.appId, secret: config.secret, auth_code: code } });
    const list = await tiktokApi<AdvertiserList>("/oauth2/advertiser/get/", { token: token.access_token, query: { app_id: config.appId, secret: config.secret } });
    const advertisers = list.list?.length ? list.list : (token.advertiser_ids || []).map((id) => ({ advertiser_id: id, advertiser_name: undefined }));
    if (!advertisers.length) return go("erro=sem_contas");
    // Moeda e fuso (opcional: se falhar, conecta mesmo assim).
    const info = new Map<string, { name?: string; currency?: string; timezone?: string }>();
    try {
      for (let i = 0; i < advertisers.length; i += 100) {
        const ids = advertisers.slice(i, i + 100).map((a) => a.advertiser_id);
        const data = await tiktokApi<AdvertiserInfo>("/advertiser/info/", { token: token.access_token, query: { advertiser_ids: ids, fields: ["advertiser_id", "name", "currency", "timezone"] } });
        for (const row of Array.isArray(data) ? data : data.list || []) info.set(String(row.advertiser_id), row);
      }
    } catch {}
    const secured = await encryptSecret(token.access_token);
    const workspaceId = `ws_${(await sha256(userId)).slice(0, 24)}`;
    for (const adv of advertisers) {
      const extra = info.get(String(adv.advertiser_id)) || {};
      const name = adv.advertiser_name || extra.name || `Conta ${adv.advertiser_id}`;
      await db.insert(tiktokAccounts).values({ id: crypto.randomUUID(), workspaceId, userId, advertiserId: String(adv.advertiser_id), advertiserName: name, currency: extra.currency || null, timezone: extra.timezone || null, accessTokenCipher: secured.cipher, accessTokenIv: secured.iv, selected: 0, connectedAt: now, updatedAt: now })
        .onConflictDoUpdate({ target: [tiktokAccounts.userId, tiktokAccounts.advertiserId], set: { advertiserName: name, currency: extra.currency || null, timezone: extra.timezone || null, accessTokenCipher: secured.cipher, accessTokenIv: secured.iv, updatedAt: now } });
    }
    return go(`conectado=1&contas=${advertisers.length}`);
  } catch (error) {
    console.error("TikTok OAuth callback failed", error instanceof Error ? error.message : "");
    return go(`erro=${error instanceof Error && error.message === "STATE_INVALID" ? "sessao" : "oauth"}`);
  }
}
