import { eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { emailVerifications, users } from "@/db/schema";
import {
  clientIpFromRequest,
  hasConflictingOrigin,
  isLoginRateLimited,
  logLoginAttempt,
  randomToken,
  sha256,
} from "@/lib/trackbase-security";

// POST {email}: reenvia o link de verificação. Resposta sempre genérica.
export async function POST(request: Request) {
  if (hasConflictingOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = String(body.email || "").trim().toLowerCase();
  const ip = clientIpFromRequest(request);
  const generic = Response.json({ ok: true, message: "Se esse e-mail estiver cadastrado, você receberá as instruções." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return generic;
  if (await isLoginRateLimited(email, ip)) return Response.json({ error: "Muitas tentativas. Aguarde 10 minutos." }, { status: 429 });
  try {
    await ensureDb();
    const db = getDb();
    const [user] = await db.select({ id: users.id, verified: users.emailVerifiedAt }).from(users).where(eq(users.email, email)).limit(1);
    await logLoginAttempt(email, ip, true);
    if (!user || user.verified) return generic;
    const now = Math.floor(Date.now() / 1000);
    await db.update(emailVerifications).set({ usedAt: now }).where(eq(emailVerifications.userId, user.id));
    const token = randomToken();
    await db.insert(emailVerifications).values({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash: await sha256(token),
      expiresAt: now + 24 * 3600,
      createdAt: now,
    });
    const { appBaseUrl, sendEmail, verifyEmailMessage } = await import("@/lib/email");
    const msg = verifyEmailMessage(`${appBaseUrl(request)}/verificar-email?token=${encodeURIComponent(token)}`);
    await sendEmail(email, msg.subject, msg.text);
    return generic;
  } catch (error) {
    console.error("verify email request", error);
    return generic;
  }
}
