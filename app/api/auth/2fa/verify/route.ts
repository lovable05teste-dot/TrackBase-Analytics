import { eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { users } from "@/db/schema";
import {
  SESSION_TTL_SECONDS,
  clientIpFromRequest,
  decryptSecret,
  finalizePendingSession,
  getSessionByToken,
  hasConflictingOrigin,
  logAdminAccess,
  sessionCookie,
  verifyTotpCode,
} from "@/lib/trackbase-security";

// POST {code}: segunda etapa do login — consome a sessão pendente (cookie
// tb_session de 10 min) e a promove a sessão completa após código válido.
export async function POST(request: Request) {
  if (hasConflictingOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { code?: string };
  const ip = clientIpFromRequest(request);
  const cookie = request.headers.get("cookie")?.match(/(?:^|;\s*)tb_session=([^;]+)/)?.[1];
  const pending = await getSessionByToken(cookie);
  if (!cookie || !pending || !pending.pending2fa)
    return Response.json({ error: "Sessão de verificação expirada. Entre de novo." }, { status: 401 });
  let ok = false;
  if (pending.userId === "trackbase-owner") {
    const ownerSecret = (process.env.ADMIN_TOTP_SECRET || "").trim();
    ok = !!ownerSecret && (await verifyTotpCode(ownerSecret, String(body.code || "")));
  } else {
    try {
      await ensureDb();
      const [row] = await getDb()
        .select({ cipher: users.totpSecretCipher, iv: users.totpIv, enabled: users.totpEnabled })
        .from(users)
        .where(eq(users.id, pending.userId))
        .limit(1);
      if (row?.enabled && row.cipher && row.iv) ok = await verifyTotpCode(await decryptSecret(row.cipher, row.iv), String(body.code || ""));
    } catch (error) {
      console.error("2fa verify lookup", error);
    }
  }
  if (!ok) {
    logAdminAccess("login-2fa-failed", { ip, userId: pending.userId });
    return Response.json({ error: "Código inválido." }, { status: 401 });
  }
  await finalizePendingSession(cookie);
  logAdminAccess("login-2fa-ok", { ip, userId: pending.userId });
  return Response.json({ ok: true }, { headers: { "set-cookie": sessionCookie(cookie, SESSION_TTL_SECONDS) } });
}
