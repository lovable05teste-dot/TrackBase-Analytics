import { and, eq, gte } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { metaAccounts, metaOauthStates } from "@/db/schema";
import { metaJson, metaPages, metaRedirectUri, requireMetaConfig } from "@/lib/meta";
import { encryptSecret, requestUserId, sha256 } from "@/lib/trackbase-security";

type Token = { access_token: string; expires_in?: number };
type MetaUser = { id: string; name?: string };
type AdAccounts = {
  data: Array<{
    account_id: string;
    name?: string;
    currency?: string;
    timezone_name?: string;
    account_status?: number;
  }>;
};

const PUBLIC_APP_HOSTS = new Set(["ghostscale.com.br", "www.ghostscale.com.br"]);

function stateOrigin(state: string) {
  const host = state.slice(state.lastIndexOf(".") + 1).toLowerCase();
  return PUBLIC_APP_HOSTS.has(host) ? `https://${host}` : null;
}

function accountsRedirect(request: Request, query: string, origin?: string | null) {
  const safeOrigin = origin && PUBLIC_APP_HOSTS.has(new URL(origin).hostname.toLowerCase()) ? origin : new URL(request.url).origin;
  return new URL(`/contas-meta?${query}`, safeOrigin);
}

export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const state = incoming.searchParams.get("state") || "";
  const origin = stateOrigin(state);

  if (incoming.searchParams.get("error")) return Response.redirect(accountsRedirect(request, "erro=cancelado", origin), 302);

  const code = incoming.searchParams.get("code") || "";
  if (!code || !state) return Response.redirect(accountsRedirect(request, "erro=retorno"), 302);

  try {
    await ensureDb();
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    const stateHash = await sha256(state);
    const [valid] = await db
      .delete(metaOauthStates)
      .where(and(eq(metaOauthStates.stateHash, stateHash), gte(metaOauthStates.expiresAt, now)))
      .returning({ userId: metaOauthStates.userId });

    if (!valid) throw new Error("STATE_INVALID");
    const cookieUserId = await requestUserId(request);
    if (cookieUserId && cookieUserId !== valid.userId) throw new Error("STATE_INVALID");

    const userId = valid.userId;
    const config = requireMetaConfig();
    const redirectUri = metaRedirectUri();
    const exchange = new URL(`https://graph.facebook.com/${config.version}/oauth/access_token`);
    exchange.searchParams.set("client_id", config.appId);
    exchange.searchParams.set("client_secret", config.appSecret);
    exchange.searchParams.set("redirect_uri", redirectUri);
    exchange.searchParams.set("code", code);

    const shortToken = await metaJson<Token>(exchange.toString());
    const longUrl = new URL(`https://graph.facebook.com/${config.version}/oauth/access_token`);
    longUrl.searchParams.set("grant_type", "fb_exchange_token");
    longUrl.searchParams.set("client_id", config.appId);
    longUrl.searchParams.set("client_secret", config.appSecret);
    longUrl.searchParams.set("fb_exchange_token", shortToken.access_token);

    let token = shortToken;
    try {
      token = await metaJson<Token>(longUrl.toString());
    } catch {
      // O token curto ainda pode ser usado quando a troca por longa duração não estiver disponível.
    }

    const graph = new URL(`https://graph.facebook.com/${config.version}/me`);
    graph.searchParams.set("fields", "id,name");
    graph.searchParams.set("access_token", token.access_token);
    const accountUrl = new URL(`https://graph.facebook.com/${config.version}/me/adaccounts`);
    accountUrl.searchParams.set("fields", "account_id,name,currency,timezone_name,account_status");
    accountUrl.searchParams.set("limit", "200");
    accountUrl.searchParams.set("access_token", token.access_token);

    const [metaUser, accounts] = await Promise.all([
      metaJson<MetaUser>(graph.toString()),
      metaPages<AdAccounts["data"][number]>(accountUrl.toString()),
    ]);
    if (!accounts.data.length) return Response.redirect(accountsRedirect(request, "erro=sem_contas", origin), 302);

    const secured = await encryptSecret(token.access_token);
    const workspaceId = `ws_${(await sha256(userId)).slice(0, 24)}`;
    const expiresAt = token.expires_in ? now + token.expires_in : null;
    for (const account of accounts.data) {
      await db
        .insert(metaAccounts)
        .values({
          id: crypto.randomUUID(),
          workspaceId,
          userId,
          metaUserId: metaUser.id,
          metaUserName: metaUser.name || null,
          adAccountId: account.account_id,
          accountName: account.name || `Conta ${account.account_id}`,
          currency: account.currency || null,
          timezoneName: account.timezone_name || null,
          accountStatus: account.account_status ?? null,
          accessTokenCipher: secured.cipher,
          accessTokenIv: secured.iv,
          tokenExpiresAt: expiresAt,
          selected: 0,
          connectedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [metaAccounts.userId, metaAccounts.adAccountId],
          set: {
            metaUserId: metaUser.id,
            metaUserName: metaUser.name || null,
            accountName: account.name || `Conta ${account.account_id}`,
            currency: account.currency || null,
            timezoneName: account.timezone_name || null,
            accountStatus: account.account_status ?? null,
            accessTokenCipher: secured.cipher,
            accessTokenIv: secured.iv,
            tokenExpiresAt: expiresAt,
            updatedAt: now,
          },
        });
    }

    return Response.redirect(accountsRedirect(request, `conectado=1&contas=${accounts.data.length}`, origin), 302);
  } catch (error) {
    console.error("Meta OAuth callback failed");
    const reason = error instanceof Error && error.message === "STATE_INVALID" ? "sessao" : "oauth";
    return Response.redirect(accountsRedirect(request, `erro=${reason}`, origin), 302);
  }
}
