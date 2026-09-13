import { sendEmail, appBaseUrl } from "./email";

function brandHtml(title: string, bodyHtml: string, cta?: { label: string; href: string }) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#080b12;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;"><div style="max-width:560px;margin:0 auto;padding:24px;"><div style="background:linear-gradient(180deg,#101521 0%,#0b0e17 100%);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:28px;"><div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#ff4d5e;font-weight:800;">GhostScale</div><h1 style="margin:12px 0 8px;font-size:22px;color:#f1f5f9;">${title}</h1>${bodyHtml}${cta ? `<div style="margin-top:20px;"><a href="${cta.href}" style="display:inline-block;background:#ff0030;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:700;">${cta.label}</a></div>` : ""}</div><p style="margin:16px 0 0;text-align:center;font-size:12px;color:#475569;">GhostScale · rastreamento para quem domina o tráfego</p></div></body></html>`;
}
function shaMask(v: string) { return v.slice(0, 3) + "***"; }

export async function emailWelcome(to: string) {
  const text = `Bem-vindo ao GhostScale!\n\nSua conta foi criada. Escolha um plano em /planos para liberar o painel completo.\nNo modo demonstração você já pode navegar por tudo.`;
  const html = brandHtml("Bem-vindo ao GhostScale", `<p style="color:#94a3b8;line-height:1.6;">Sua conta foi criada. Escolha um plano para liberar o painel completo. No modo demonstração você já pode navegar por tudo.</p>`, { label: "Ver planos", href: `${appBaseUrl()}/planos` });
  return sendEmail(to, "Bem-vindo ao GhostScale", text, html);
}
export async function emailPaymentPending(to: string, planName: string) {
  const text = `Pagamento pendente — ${planName}\n\nGeramos sua cobrança (Pix/boleto). Assim que o pagamento for confirmado, seu plano é liberado automaticamente.`;
  const html = brandHtml("Pagamento pendente", `<p style="color:#94a3b8;line-height:1.6;">Geramos sua cobrança do plano <b style="color:#fff;">${planName}</b>. Assim que o pagamento for confirmado, liberamos seu acesso automaticamente.</p>`);
  return sendEmail(to, `Pagamento pendente — ${planName} · GhostScale`, text, html);
}
export async function emailPaymentConfirmed(to: string, planName: string) {
  const text = `Pagamento confirmado — ${planName}\n\nSeu plano ${planName} está ativo! Acesse o painel em / .`;
  const html = brandHtml("Pagamento confirmado!", `<p style="color:#94a3b8;line-height:1.6;">Seu plano <b style="color:#fff;">${planName}</b> está ativo. Já pode usar todos os recursos liberados.</p>`, { label: "Abrir painel", href: `${appBaseUrl()}/` });
  return sendEmail(to, `Pagamento confirmado — ${planName} · GhostScale`, text, html);
}
export async function emailPaymentRefused(to: string, planName: string, reason?: string) {
  const text = `Pagamento recusado — ${planName}\n\nNão conseguimos aprovar seu pagamento${reason ? `: ${reason}` : "."} Tente novamente em /planos.`;
  const html = brandHtml("Pagamento não aprovado", `<p style="color:#94a3b8;line-height:1.6;">Não aprovamos seu pagamento do plano <b style="color:#fff;">${planName}</b>${reason ? ` — ${reason}` : ""}. Tente novamente.</p>`, { label: "Tentar novamente", href: `${appBaseUrl()}/planos` });
  return sendEmail(to, `Pagamento não aprovado — ${planName}`, text, html);
}
export async function emailUsageWarning(to: string, used: number, limit: number, pct: number) {
  const text = `Você já usou ${used} de ${limit} vendas (${pct}%). Considere upgrade ou pacote para não pausar.`;
  const html = brandHtml(`Você já usou ${pct}% da franquia`, `<p style="color:#94a3b8;">${used} de ${limit} vendas no ciclo atual.</p><div style="background:rgba(255,255,255,.08);border-radius:999px;height:10px;overflow:hidden;"><div style="width:${pct}%;height:100%;background:#ff0030;"></div></div>`, { label: "Ver planos", href: `${appBaseUrl()}/planos` });
  return sendEmail(to, `Aviso: ${pct}% da franquia usada · GhostScale`, text, html);
}
export async function emailLimitReached(to: string, limit: number) {
  const text = `Franquia atingida (${limit} vendas). Vendas excedentes ficam aguardando regularização. Faça upgrade em /planos para reprocessar.`;
  const html = brandHtml("Franquia atingida", `<p style="color:#94a3b8;">Você atingiu ${limit} vendas no ciclo. Novas vendas ficam <b style="color:#fff;">aguardando regularização</b> — sem perda, sem dívida automática. Faça upgrade para reprocessar.</p>`, { label: "Fazer upgrade", href: `${appBaseUrl()}/planos` });
  return sendEmail(to, `Franquia atingida · GhostScale`, text, html);
}
export async function emailRenewal(to: string, planName: string, nextDate: string) {
  const text = `Renovação confirmada — ${planName}\nPróximo ciclo até ${nextDate}.`;
  const html = brandHtml("Renovação confirmada", `<p style="color:#94a3b8;">Seu plano <b>${planName}</b> foi renovado. Próximo vencimento: <b style="color:#fff;">${nextDate}</b>.</p>`);
  return sendEmail(to, `Renovação — ${planName} · GhostScale`, text, html);
}
export async function emailCanceled(to: string, planName: string, until: string) {
  const text = `Assinatura cancelada — ${planName}\nAcesso mantido até ${until} (período pago).`;
  const html = brandHtml("Assinatura cancelada", `<p style="color:#94a3b8;">Cancelamos sua assinatura <b>${planName}</b>. Seu acesso segue até <b style="color:#fff;">${until}</b>.</p>`);
  return sendEmail(to, `Assinatura cancelada · GhostScale`, text, html);
}
export async function emailRefunded(to: string, planName: string) {
  const text = `Reembolso processado — ${planName}\nSeu pagamento foi estornado. Acesso ajustado conforme política.`;
  const html = brandHtml("Reembolso processado", `<p style="color:#94a3b8;">Seu pagamento do plano <b>${planName}</b> foi estornado.</p>`);
  return sendEmail(to, `Reembolso — ${planName} · GhostScale`, text, html);
}

// Dedupe simples por memória + webhook_events evita duplo envio por reprocessamento
const sentInProcess = new Set<string>();
export function dedupeKey(to: string, subject: string, eventId: string) { return `${to}:${subject}:${eventId}`; }
export function alreadySent(key: string) { if (sentInProcess.has(key)) return true; sentInProcess.add(key); setTimeout(() => sentInProcess.delete(key), 60_000); return false; }
