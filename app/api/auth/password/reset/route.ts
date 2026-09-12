import { eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { passwordResets, users } from "@/db/schema";
import {
  clientIpFromRequest,
  hasConflictingOrigin,
  hashPassword,
  passwordPolicyError,
  revokeAllUserSessions,
  sha256,
} from "@/lib/trackbase-security";

// POST {token, password, confirmPassword}: consome o token (uso único,
// 20 min) e troca a senha, revogando todas as sessões.
export async function POST(request: Request) {
  if (hasConflictingOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { token?: string; password?: string; confirmPassword?: string };
  const token = String(body.token || "");
  const password = String(body.password || "");
  if (!token) return Response.json({ error: "Token inválido ou expirado." }, { status: 400 });
  const policyError = passwordPolicyError(password);
  if (policyError) return Response.json({ error: policyError }, { status: 400 });
  if (password !== String(body.confirmPassword || "")) return Response.json({ error: "As senhas não coincidem." }, { status: 400 });
  try {
    await ensureDb();
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    const [row] = await db.select().from(passwordResets).where(eq(passwordResets.tokenHash, await sha256(token))).limit(1);
    if (!row || row.usedAt || row.expiresAt < now) return Response.json({ error: "Token inválido ou expirado." }, { status: 400 });
    await db.update(passwordResets).set({ usedAt: now }).where(eq(passwordResets.id, row.id));
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(password), failedAttempts: 0, lockedUntil: null })
      .where(eq(users.id, row.userId));
    await revokeAllUserSessions(row.userId);
    console.warn(
      JSON.stringify({
        scope: "auth",
        event: "password-reset-consumed",
        at: new Date().toISOString(),
        userId: row.userId,
        ip: clientIpFromRequest(request),
      }),
    );
    return Response.json({ ok: true });
  } catch (error) {
    console.error("password reset", error);
    return Response.json({ error: "Erro interno." }, { status: 500 });
  }
}
