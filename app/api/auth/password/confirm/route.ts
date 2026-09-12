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

// POST {resetToken, password, confirmPassword}: etapa final da recuperação.
// O resetToken (uso único, 15 min) prova que o código de 6 dígitos foi validado.
export async function POST(request: Request) {
  if (hasConflictingOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { resetToken?: string; password?: string; confirmPassword?: string };
  const resetToken = String(body.resetToken || "");
  const password = String(body.password || "");
  if (!resetToken) return Response.json({ error: "Sessão de recuperação expirada. Comece de novo.", expired: true }, { status: 400 });
  const policyError = passwordPolicyError(password);
  if (policyError) return Response.json({ error: policyError }, { status: 400 });
  if (password !== String(body.confirmPassword || "")) return Response.json({ error: "As senhas não coincidem." }, { status: 400 });
  try {
    await ensureDb();
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    const [row] = await db.select().from(passwordResets).where(eq(passwordResets.tokenHash, await sha256(resetToken))).limit(1);
    if (!row || row.usedAt || row.expiresAt < now)
      return Response.json({ error: "Sessão de recuperação expirada. Comece de novo.", expired: true }, { status: 400 });
    await db.update(passwordResets).set({ usedAt: now }).where(eq(passwordResets.id, row.id));
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(password), failedAttempts: 0, lockedUntil: null })
      .where(eq(users.id, row.userId));
    await revokeAllUserSessions(row.userId);
    console.warn(
      JSON.stringify({
        scope: "auth",
        event: "password-changed",
        at: new Date().toISOString(),
        userId: row.userId,
        ip: clientIpFromRequest(request),
      }),
    );
    return Response.json({ ok: true });
  } catch (error) {
    console.error("password confirm", error);
    return Response.json({ error: "Erro interno." }, { status: 500 });
  }
}
