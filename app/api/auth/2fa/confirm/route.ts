import { eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { users } from "@/db/schema";
import {
  decryptSecret,
  finalizePendingSession,
  hasConflictingOrigin,
  requestUserIdAllowPending,
  sessionCookie,
  SESSION_TTL_SECONDS,
  verifyTotpCode,
} from "@/lib/trackbase-security";

// POST {code}: confirma o segredo gerado no setup e ativa o 2FA. Se a sessão
// era pendente (2FA obrigatório), ela é promovida a sessão completa aqui.
export async function POST(request: Request) {
  if (hasConflictingOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const userId = await requestUserIdAllowPending(request);
  if (!userId || userId === "trackbase-owner") return Response.json({ error: "Não autenticado." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { code?: string };
  try {
    await ensureDb();
    const [user] = await getDb().select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user?.totpSecretCipher || !user.totpIv) return Response.json({ error: "Inicie a ativação primeiro." }, { status: 400 });
    const ok = await verifyTotpCode(await decryptSecret(user.totpSecretCipher, user.totpIv), String(body.code || ""));
    if (!ok) return Response.json({ error: "Código inválido. Confira o app autenticador." }, { status: 401 });
    await getDb().update(users).set({ totpEnabled: 1 }).where(eq(users.id, userId));
    const cookie = request.headers.get("cookie")?.match(/(?:^|;\s*)tb_session=([^;]+)/)?.[1];
    const { getSessionByToken } = await import("@/lib/trackbase-security");
    const pending = await getSessionByToken(cookie);
    if (cookie && pending?.pending2fa) {
      await finalizePendingSession(cookie);
      return Response.json({ enabled: true }, { headers: { "set-cookie": sessionCookie(cookie, SESSION_TTL_SECONDS) } });
    }
    return Response.json({ enabled: true });
  } catch (error) {
    console.error("2fa confirm", error);
    return Response.json({ error: "Erro interno." }, { status: 500 });
  }
}
