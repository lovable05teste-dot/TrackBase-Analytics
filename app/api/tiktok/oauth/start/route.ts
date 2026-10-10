import { lt } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { metaOauthStates } from "@/db/schema";
import { userFromConnectLink } from "@/lib/connect-link";
import { requireTiktokConfig, tiktokRedirectUri } from "@/lib/tiktok";
import { requestUserId, sha256 } from "@/lib/trackbase-security";

export const dynamic = "force-dynamic";

// Abre a autorização do TikTok for Business. Aceita a sessão normal ou o
// link de conexão (?t=) do AdsPower, que não grava cookie nenhum.
export async function GET(request: Request) {
  const hasLink = new URL(request.url).searchParams.has("t");
  const linkUser = hasLink ? await userFromConnectLink(request) : null;
  if (hasLink && !linkUser) return Response.redirect(new URL("/meta-conectado?p=tiktok&erro=link", request.url), 302);
  const userId = linkUser ?? (await requestUserId(request));
  if (!userId) return Response.redirect(new URL("/login?return_to=%2Ftiktok", request.url), 302);
  const done = linkUser ? "/meta-conectado?p=tiktok&" : "/tiktok?";
  try {
    await ensureDb();
    const config = requireTiktokConfig();
    // O prefixo diz ao retorno para onde voltar (link = página neutra).
    const state = `${linkUser ? "l" : "s"}${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}`;
    const now = Math.floor(Date.now() / 1000);
    const db = getDb();
    try { await db.delete(metaOauthStates).where(lt(metaOauthStates.expiresAt, now)); } catch {}
    await db.insert(metaOauthStates).values({ id: crypto.randomUUID(), userId, stateHash: await sha256(`tiktok:${state}`), expiresAt: now + 600, createdAt: now });
    const url = new URL("https://business-api.tiktok.com/portal/auth");
    url.searchParams.set("app_id", config.appId);
    url.searchParams.set("state", state);
    url.searchParams.set("redirect_uri", tiktokRedirectUri());
    return new Response(null, { status: 302, headers: { Location: url.toString(), "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } catch (error) {
    const code = error instanceof Error && error.message === "TIKTOK_NOT_CONFIGURED" ? "config" : "start";
    return Response.redirect(new URL(`${done}erro=${code}`, request.url), 302);
  }
}
