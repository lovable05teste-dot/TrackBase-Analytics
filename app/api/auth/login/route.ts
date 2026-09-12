import { eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { users } from "@/db/schema";
import {
  ACCOUNT_LOCKOUT_ATTEMPTS,
  ACCOUNT_LOCKOUT_SECONDS,
  PENDING_2FA_TTL_SECONDS,
  clientIpFromRequest,
  createSession,
  hasConflictingOrigin,
  isLoginRateLimited,
  logAdminAccess,
  logLoginAttempt,
  sessionCookie,
  sha256,
  timingSafeEqual,
  verifyPassword,
  hashPassword,
} from "@/lib/trackbase-security";

export async function POST(request: Request) {
  if (hasConflictingOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
  const ip = clientIpFromRequest(request);
  const userAgent = request.headers.get("user-agent");

  if (body.email && body.password) {
    const email = body.email.trim().toLowerCase();
    if (await isLoginRateLimited(email, ip)) {
      await logLoginAttempt(email, ip, false);
      return Response.json({ error: "Muitas tentativas. Aguarde 10 minutos." }, { status: 429 });
    }
    try {
      await ensureDb();
      const [user] = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
      // Resposta genérica: não revelar se o e-mail existe.
      if (!user) {
        await logLoginAttempt(email, ip, false);
        return Response.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
      }
      const now = Math.floor(Date.now() / 1000);
      if (user.lockedUntil && user.lockedUntil > now) {
        await logLoginAttempt(email, ip, false);
        return Response.json({ error: "Conta bloqueada temporariamente. Tente de novo em alguns minutos." }, { status: 423 });
      }
      const result = await verifyPassword(body.password, user.passwordHash);
      if (result === "invalid") {
        const failed = (user.failedAttempts ?? 0) + 1;
        const lockedUntil = failed >= ACCOUNT_LOCKOUT_ATTEMPTS ? now + ACCOUNT_LOCKOUT_SECONDS : user.lockedUntil;
        await getDb().update(users).set({ failedAttempts: failed, lockedUntil }).where(eq(users.id, user.id));
        await logLoginAttempt(email, ip, false);
        return Response.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
      }
      // Migração transparente do SHA-256 legado para PBKDF2.
      const updates: { failedAttempts?: number; lockedUntil?: number | null; passwordHash?: string } = {
        failedAttempts: 0,
        lockedUntil: null,
      };
      if (result === "valid-legacy") updates.passwordHash = await hashPassword(body.password);
      await getDb().update(users).set(updates).where(eq(users.id, user.id));
      await logLoginAttempt(email, ip, true);
      if (process.env.REQUIRE_EMAIL_VERIFIED === "true" && !user.emailVerifiedAt) {
        return Response.json(
          { error: "Confirme seu e-mail antes de entrar. Solicite o reenvio abaixo.", needVerification: true },
          { status: 403 },
        );
      }
      const has2fa = Boolean(user.totpEnabled && user.totpSecretCipher && user.totpIv);
      if (process.env.REQUIRE_2FA === "true" && !has2fa) {
        const pending = await createSession({ userId: user.id, ttlSeconds: PENDING_2FA_TTL_SECONDS, ip, userAgent, pending2fa: true });
        return Response.json(
          { ok: true, require2faSetup: true },
          { headers: { "set-cookie": sessionCookie(pending, PENDING_2FA_TTL_SECONDS) } },
        );
      }
      if (has2fa) {
        const pending = await createSession({ userId: user.id, ttlSeconds: PENDING_2FA_TTL_SECONDS, ip, userAgent, pending2fa: true });
        return Response.json(
          { ok: true, require2fa: true },
          { headers: { "set-cookie": sessionCookie(pending, PENDING_2FA_TTL_SECONDS) } },
        );
      }
      const token = await createSession({ userId: user.id, ip, userAgent });
      return Response.json({ ok: true }, { headers: { "set-cookie": sessionCookie(token) } });
    } catch (error) {
      console.error("login email", error);
      const msg = error instanceof Error ? error.message : "";
      if (/não configurad/i.test(msg)) return Response.json({ error: "Banco de dados não configurado. Fale com o suporte." }, { status: 503 });
      return Response.json({ error: "Erro interno." }, { status: 500 });
    }
  }

  // Login administrativo (painel isolado): senha do ambiente + 2FA se configurado.
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return Response.json({ error: "Login administrativo indisponível." }, { status: 503 });
  if (!body.password || !timingSafeEqual(await sha256(`trackbase:${body.password}`), await sha256(`trackbase:${secret}`))) {
    await logLoginAttempt(null, ip, false);
    logAdminAccess("login-failed", { ip });
    if (await isLoginRateLimited(null, ip)) return Response.json({ error: "Muitas tentativas. Aguarde 10 minutos." }, { status: 429 });
    return Response.json({ error: "Senha incorreta." }, { status: 401 });
  }
  await logLoginAttempt(null, ip, true);
  const ownerTotp = (process.env.ADMIN_TOTP_SECRET || "").trim();
  if (process.env.REQUIRE_2FA === "true" && !ownerTotp) {
    logAdminAccess("login-blocked-no-owner-2fa", { ip });
    return Response.json({ error: "2FA obrigatório: configure ADMIN_TOTP_SECRET." }, { status: 403 });
  }
  if (ownerTotp) {
    const pending = await createSession({ userId: "trackbase-owner", isAdmin: true, ttlSeconds: PENDING_2FA_TTL_SECONDS, ip, userAgent, pending2fa: true });
    logAdminAccess("login-password-ok-2fa-required", { ip });
    return Response.json(
      { ok: true, require2fa: true },
      { headers: { "set-cookie": sessionCookie(pending, PENDING_2FA_TTL_SECONDS) } },
    );
  }
  logAdminAccess("login-ok-no-owner-2fa", { ip, warning: "ADMIN_TOTP_SECRET ausente — ative 2FA do dono" });
  const token = await createSession({ userId: "trackbase-owner", isAdmin: true, ip, userAgent });
  return Response.json({ ok: true }, { headers: { "set-cookie": sessionCookie(token) } });
}
