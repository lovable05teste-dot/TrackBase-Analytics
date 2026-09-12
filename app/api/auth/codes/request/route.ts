import { ensureDb } from "@/db";
import {
  CODE_TTL_SECONDS,
  isCodePurpose,
  issueCode,
  prepareCodeRequest,
} from "@/lib/verification-codes";
import { emailConfigured, passwordResetCodeEmail, providerErrorMessage, sendEmail, verifyEmailCodeEmail } from "@/lib/email";
import { clientIpFromRequest, hasConflictingOrigin, isLoginRateLimited, logLoginAttempt } from "@/lib/trackbase-security";

// POST {email, purpose}: envia código de 6 dígitos (10 min) via MailerSend.
// Resposta sempre genérica quando o e-mail não exige ação (não revela base).
export async function POST(request: Request) {
  if (hasConflictingOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { email?: string; purpose?: string };
  const email = String(body.email || "").trim().toLowerCase();
  const ip = clientIpFromRequest(request);
  const generic = { ok: true, message: "Se esse e-mail estiver cadastrado, você receberá um código.", expiresIn: CODE_TTL_SECONDS };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "Informe um e-mail válido." }, { status: 400 });
  if (!isCodePurpose(body.purpose)) return Response.json({ error: "Finalidade inválida." }, { status: 400 });
  if (await isLoginRateLimited(email, ip)) return Response.json({ error: "Muitas tentativas. Aguarde 10 minutos." }, { status: 429 });
  try {
    await ensureDb();
    const prepared = await prepareCodeRequest(email, body.purpose);
    if (prepared.status === "rate-limited")
      return Response.json({ error: `Aguarde ${prepared.retryAfter}s para pedir um novo código.`, retryAfter: prepared.retryAfter }, { status: 429 });
    if (prepared.status === "nothing-to-do") {
      await logLoginAttempt(email, ip, true);
      return Response.json(generic);
    }
    const code = await issueCode(prepared.userId, email, body.purpose);
    const msg =
      body.purpose === "password_reset" ? passwordResetCodeEmail(code, CODE_TTL_SECONDS / 60) : verifyEmailCodeEmail(code, CODE_TTL_SECONDS / 60);
    const result = await sendEmail(email, msg.subject, msg.text, msg.html);
    await logLoginAttempt(email, ip, true);
    console.warn(JSON.stringify({ scope: "auth", event: "code-issued", at: new Date().toISOString(), purpose: body.purpose }));
    if (result === "logged" && emailConfigured())
      return Response.json({ error: providerErrorMessage() }, { status: 502 });
    return Response.json(generic);
  } catch (error) {
    console.error("codes request", error);
    return Response.json({ error: providerErrorMessage() }, { status: 502 });
  }
}
