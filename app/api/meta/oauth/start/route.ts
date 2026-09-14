import { lt } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { metaOauthStates } from "@/db/schema";
import { metaRedirectUri, requireMetaConfig } from "@/lib/meta";
import { requestUserId, sessionCookie, sha256 } from "@/lib/trackbase-security";

export const dynamic = "force-dynamic";

const PUBLIC_APP_HOSTS = new Set(["ghostscale.com.br", "www.ghostscale.com.br"]);

function returnHost(request: Request, callbackOrigin: string) {
  const host = new URL(request.url).hostname.toLowerCase();
  return PUBLIC_APP_HOSTS.has(host) ? host : new URL(callbackOrigin).hostname;
}

export async function GET(request: Request) {
  const userId = await requestUserId(request);
  if (!userId) return Response.redirect(new URL("/login", request.url), 302);

  try {
    await ensureDb();
    const config = requireMetaConfig();
    const redirectUri = metaRedirectUri();
    const callbackOrigin = new URL(redirectUri).origin;
    const state = `${crypto.randomUUID()}${crypto.randomUUID()}.${returnHost(request, callbackOrigin)}`;
    const now = Math.floor(Date.now() / 1000);
    const db = getDb();

    await db.delete(metaOauthStates).where(lt(metaOauthStates.expiresAt, now));
    await db.insert(metaOauthStates).values({
      id: crypto.randomUUID(),
      userId,
      stateHash: await sha256(state),
      expiresAt: now + 600,
      createdAt: now,
    });

    const url = new URL(`https://www.facebook.com/${config.version}/dialog/oauth`);
    url.searchParams.set("client_id", config.appId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "ads_read,ads_management,business_management");
    if (config.configId) url.searchParams.set("config_id", config.configId);

    const headers = new Headers({ Location: url.toString(), "Cache-Control": "no-store" });
    const token = request.headers.get("cookie")?.match(/(?:^|;\s*)tb_session=([^;]+)/)?.[1];
    if (token) headers.set("Set-Cookie", sessionCookie(token));
    return new Response(null, { status: 302, headers });
  } catch (error) {
    console.error("Meta OAuth start failed");
    const code = error instanceof Error && error.message === "META_NOT_CONFIGURED" ? "config" : "start";
    return Response.redirect(new URL(`/contas-meta?erro=${code}`, request.url), 302);
  }
}
