// Envio transacional mínimo (Resend ou MailerSend, via EMAIL_PROVIDER).
// Sem chave do provedor configurada, opera em modo log-only: registra
// destinatário/assunto (nunca tokens/links) para auditoria. Falhas de envio
// nunca quebram o fluxo de auth.
const RESEND_URL = "https://api.resend.com/emails";
const MAILERSEND_URL = "https://api.mailersend.com/v1/email";

export type EmailProvider = "resend" | "mailersend";

export function emailProvider(): EmailProvider {
  return (process.env.EMAIL_PROVIDER || "").trim().toLowerCase() === "mailersend" ? "mailersend" : "resend";
}

function providerKey() {
  const provider = emailProvider();
  const key = provider === "mailersend" ? process.env.MAILERSEND_API_KEY : process.env.RESEND_API_KEY;
  return { provider, key: (key || "").trim() };
}

export function emailConfigured() {
  return Boolean(providerKey().key);
}

export function emailFrom() {
  return (process.env.EMAIL_FROM || "GhostScale <no-reply@ghostscale.app>").trim();
}

function splitFrom(raw: string) {
  const match = raw.match(/^(.*)<([^<>]+)>$/);
  if (match) return { name: match[1].trim() || undefined, email: match[2].trim() };
  return { name: undefined as string | undefined, email: raw.trim() };
}

export function appBaseUrl(request?: Request) {
  const configured = (process.env.APP_URL || "").trim().replace(/\/+$/, "");
  if (configured) return configured;
  if (request) {
    try {
      return new URL(request.url).origin;
    } catch {
      // cai para o fallback abaixo
    }
  }
  return "https://app.local";
}

async function sendViaResend(key: string, to: string, subject: string, text: string) {
  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: emailFrom(), to: [to], subject, text }),
  });
  return res.ok ? null : `status ${res.status}`;
}

async function sendViaMailerSend(key: string, to: string, subject: string, text: string) {
  const from = splitFrom(emailFrom());
  const res = await fetch(MAILERSEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json", "X-Requested-With": "XMLHttpRequest" },
    body: JSON.stringify({ from: { email: from.email, ...(from.name ? { name: from.name } : {}) }, to: [{ email: to }], subject, text }),
  });
  return res.ok ? null : `status ${res.status}`;
}

export async function sendEmail(to: string, subject: string, text: string): Promise<"sent" | "logged"> {
  const { provider, key } = providerKey();
  const entry = { scope: "email", provider, to, subject, at: new Date().toISOString() };
  if (!key) {
    console.warn(JSON.stringify({ ...entry, mode: "log-only" }));
    return "logged";
  }
  try {
    const failure = provider === "mailersend" ? await sendViaMailerSend(key, to, subject, text) : await sendViaResend(key, to, subject, text);
    if (failure) {
      console.error(JSON.stringify({ ...entry, mode: "send-failed", failure }));
      return "logged";
    }
    console.warn(JSON.stringify({ ...entry, mode: "sent" }));
    return "sent";
  } catch (error) {
    console.error(JSON.stringify({ ...entry, mode: "send-error", error: error instanceof Error ? error.message : "?" }));
    return "logged";
  }
}

export function passwordResetEmail(link: string) {
  return {
    subject: "Redefinir sua senha — GhostScale",
    text: [
      "Recebemos um pedido de redefinição de senha para sua conta.",
      "",
      `Troque sua senha aqui (válido por 20 minutos, uso único): ${link}`,
      "",
      "Se não foi você, ignore este e-mail — sua senha continua a mesma.",
    ].join("\n"),
  };
}

export function verifyEmailMessage(link: string) {
  return {
    subject: "Confirme seu e-mail — GhostScale",
    text: [
      "Bem-vindo! Falta só confirmar seu e-mail:",
      "",
      `${link}`,
      "",
      "O link vale por 24 horas e só pode ser usado uma vez.",
    ].join("\n"),
  };
}
