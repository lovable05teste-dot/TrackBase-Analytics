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

async function sendViaResend(key: string, to: string, subject: string, text: string, html?: string) {
  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: emailFrom(), to: [to], subject, text, ...(html ? { html } : {}) }),
  });
  return res.ok ? null : `status ${res.status}`;
}

async function sendViaMailerSend(key: string, to: string, subject: string, text: string, html?: string) {
  const from = splitFrom(emailFrom());
  const res = await fetch(MAILERSEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json", "X-Requested-With": "XMLHttpRequest" },
    body: JSON.stringify({
      from: { email: from.email, ...(from.name ? { name: from.name } : {}) },
      to: [{ email: to }],
      subject,
      text,
      ...(html ? { html } : {}),
    }),
  });
  return res.ok ? null : `status ${res.status}`;
}

// Mensagem amigável para falhas de rede/timeout do provedor — nunca vazar
// detalhe técnico para o usuário final.
export function providerErrorMessage() {
  return "Não conseguimos enviar o e-mail agora. Tente de novo em instantes.";
}

export async function sendEmail(to: string, subject: string, text: string, html?: string): Promise<"sent" | "logged"> {
  const { provider, key } = providerKey();
  const entry = { scope: "email", provider, to, subject, at: new Date().toISOString() };
  if (!key) {
    console.warn(JSON.stringify({ ...entry, mode: "log-only" }));
    return "logged";
  }
  try {
    const failure =
      provider === "mailersend" ? await sendViaMailerSend(key, to, subject, text, html) : await sendViaResend(key, to, subject, text, html);
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

// ---------------------------------------------------------------------------
// Códigos de verificação (6 dígitos) — identidade visual GhostScale.
// O código em claro só trafega aqui (memória) e no e-mail; no banco vai hash.
// ---------------------------------------------------------------------------
function codeEmailShell(title: string, intro: string, code: string, minutes: number, outro: string) {
  const text = [title, "", intro, "", code, "", `Válido por ${minutes} minutos.`, "", outro].join("\n");
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background-color:#080b12;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"><div style="max-width:520px;margin:0 auto;padding:32px 20px;"><div style="background:linear-gradient(180deg,#101521 0%,#0b0e17 100%);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:36px 32px;text-align:center;"><div style="font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#ff4d5e;font-weight:700;">GhostScale</div><h1 style="margin:14px 0 8px;font-size:22px;color:#f1f5f9;">${title}</h1><p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#94a3b8;">${intro}</p><div style="display:inline-block;background:rgba(255,0,48,.08);border:1px solid rgba(255,0,48,.35);border-radius:14px;padding:14px 28px;font-size:32px;font-weight:800;letter-spacing:10px;color:#ffffff;">${code}</div><p style="margin:22px 0 0;font-size:13px;color:#64748b;">Válido por ${minutes} minutos. Se não foi você, ignore este e-mail.</p></div><p style="margin:20px 0 0;text-align:center;font-size:12px;color:#475569;">${outro}</p></div></body></html>`;
  return { text, html };
}

export function passwordResetCodeEmail(code: string, minutes = 10) {
  const { text, html } = codeEmailShell(
    "Seu código de recuperação",
    "Use o código abaixo para criar uma nova senha:",
    code,
    minutes,
    "Rastreamento feito para quem domina o tráfego.",
  );
  return { subject: "Seu código de recuperação — GhostScale", text, html };
}

export function verifyEmailCodeEmail(code: string, minutes = 10) {
  const { text, html } = codeEmailShell(
    "Confirme seu e-mail",
    "Use o código abaixo para ativar sua conta:",
    code,
    minutes,
    "Bem-vindo ao GhostScale.",
  );
  return { subject: "Seu código de confirmação — GhostScale", text, html };
}
