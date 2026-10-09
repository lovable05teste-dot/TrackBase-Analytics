import { eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { nativePushTokens } from "@/db/schema";
import { isExpoToken } from "@/lib/native-push";
import { requestUserId, sha256 } from "@/lib/trackbase-security";

export const dynamic = "force-dynamic";

// O app nativo abre o painel e registra aqui o token de push do aparelho,
// usando a sessão (cookie) de quem está logado.
export async function POST(request: Request) {
  const userId = await requestUserId(request);
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { token?: unknown; platform?: unknown };
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!isExpoToken(token)) return Response.json({ error: "Token inválido" }, { status: 400 });
  const platform = body.platform === "ios" || body.platform === "android" ? body.platform : "unknown";
  await ensureDb();
  const workspaceId = "ws_" + (await sha256(userId)).slice(0, 24);
  const now = Math.floor(Date.now() / 1000);
  // Um aparelho pertence a uma conta por vez: trocar de login move o token.
  await getDb().insert(nativePushTokens).values({ token, workspaceId, platform, createdAt: now }).onConflictDoUpdate({ target: [nativePushTokens.token], set: { workspaceId, platform, createdAt: now } });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const userId = await requestUserId(request);
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const token = new URL(request.url).searchParams.get("token") || "";
  await ensureDb();
  const workspaceId = "ws_" + (await sha256(userId)).slice(0, 24);
  const [row] = await getDb().select().from(nativePushTokens).where(eq(nativePushTokens.token, token)).limit(1);
  if (row && row.workspaceId === workspaceId) await getDb().delete(nativePushTokens).where(eq(nativePushTokens.token, token));
  return Response.json({ ok: true });
}
