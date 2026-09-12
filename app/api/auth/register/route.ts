import { eq, or } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { emailVerifications, users } from "@/db/schema";
import {
  clientIpFromRequest,
  createSession,
  hasConflictingOrigin,
  hashPassword,
  isLoginRateLimited,
  logLoginAttempt,
  passwordPolicyError,
  sessionCookie,
  sha256,
  randomToken,
} from "@/lib/trackbase-security";
import { stripCpf, validateCpf } from "@/lib/cpf";

export async function POST(request: Request) {
  if (hasConflictingOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const ip = clientIpFromRequest(request);
  try {
    await ensureDb();
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      email?: string;
      cpf?: string;
      password?: string;
      confirmPassword?: string;
    };
    const name = String(body.name || "").trim().replace(/\s+/g, " ");
    const email = String(body.email || "").trim().toLowerCase();
    const cpf = stripCpf(body.cpf);
    const password = String(body.password || "");
    const confirmPassword = String(body.confirmPassword || "");
    if (name.length < 3 || name.length > 120) return Response.json({ error: "Informe seu nome completo." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "Informe um e-mail válido." }, { status: 400 });
    if (!validateCpf(cpf)) return Response.json({ error: "CPF inválido. Confira os números." }, { status: 400 });
    const policyError = passwordPolicyError(password);
    if (policyError) return Response.json({ error: policyError }, { status: 400 });
    if (password !== confirmPassword) return Response.json({ error: "As senhas não coincidem." }, { status: 400 });
    if (await isLoginRateLimited(email, ip)) return Response.json({ error: "Muitas tentativas. Aguarde 10 minutos." }, { status: 429 });
    const db = getDb();
    const [existing] = await db.select({ id: users.id }).from(users).where(or(eq(users.email, email), eq(users.cpf, cpf))).limit(1);
    if (existing) return Response.json({ error: "Este e-mail ou CPF já está cadastrado. Tente entrar." }, { status: 409 });
    const passwordHash = await hashPassword(password);
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    await db.insert(users).values({ id, email, name, cpf, passwordHash, createdAt: now });
    // Token de verificação de e-mail (24h, uso único) + envio imediato.
    try {
      const verifyToken = randomToken();
      await db.insert(emailVerifications).values({
        id: crypto.randomUUID(),
        userId: id,
        tokenHash: await sha256(verifyToken),
        expiresAt: now + 24 * 3600,
        createdAt: now,
      });
      const { appBaseUrl, sendEmail, verifyEmailMessage } = await import("@/lib/email");
      const msg = verifyEmailMessage(`${appBaseUrl(request)}/verificar-email?token=${encodeURIComponent(verifyToken)}`);
      await sendEmail(email, msg.subject, msg.text);
    } catch (error) {
      console.error("email verification seed", error);
    }
    await logLoginAttempt(email, ip, true);
    const token = await createSession({ userId: id, ip, userAgent: request.headers.get("user-agent") });
    return Response.json({ ok: true }, { headers: { "set-cookie": sessionCookie(token) } });
  } catch (error) {
    console.error("register", error);
    const msg = error instanceof Error ? error.message : "";
    if (/não configurad/i.test(msg)) return Response.json({ error: "Banco de dados não configurado. Fale com o suporte." }, { status: 503 });
    return Response.json({ error: "Erro interno." }, { status: 500 });
  }
}
