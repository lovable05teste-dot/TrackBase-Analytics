import { eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { passwordResets, users } from "@/db/schema";
import {
  clientIpFromRequest,
  hasConflictingOrigin,
  isLoginRateLimited,
  logLoginAttempt,
  randomToken,
  sha256,
} from "@/lib/trackbase-security";

// POST {email}: solicita redefinição. Resposta sempre genérica (não revela
// se o e-mail existe). Token de 20 min, uso único; nova solicitação invalida
// as anteriores. O ENVIO do token depende de um provedor de e-mail (ainda
// não configurado — ver relatório); o hash do token nunca vai para os logs.
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
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    await logLoginAttempt(email, ip, true);
    if (!user) return generic;
    const now = Math.floor(Date.now() / 1000);
    // Invalida solicitações anteriores ainda abertas.
    await db.update(passwordResets).set({ usedAt: now }).where(eq(passwordResets.userId, user.id));
    const token = randomToken();
    await db.insert(passwordResets).values({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash: await sha256(token),
      expiresAt: now + 20 * 60,
      createdAt: now,
    });
    const { appBaseUrl, sendEmail, passwordResetEmail } = await import("@/lib/email");
    const msg = passwordResetEmail(`${appBaseUrl(request)}/redefinir?token=${encodeURIComponent(token)}`);
    await sendEmail(email, msg.subject, msg.text);
    console.warn(JSON.stringify({ scope: "auth", event: "password-reset-issued", at: new Date().toISOString(), userId: user.id }));
    return generic;
  } catch (error) {
    console.error("password request", error);
    return generic;
  }
}
