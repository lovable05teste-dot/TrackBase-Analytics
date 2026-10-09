// Qualidade dos dados enviados à API de Conversões nas compras: quanto mais
// compras levam e-mail, telefone, fbc (clique do anúncio) e fbp (navegador),
// mais a Meta consegue casar a venda com quem viu o anúncio.
export type QualityRow = { fbc?: string | null; fbp?: string | null; payload?: string | null };
export type CapiQuality = { total: number; email: number; phone: number; fbc: number; fbp: number; score: number; label: string; tips: string[] };

const WEIGHTS = { email: 3, phone: 2.5, fbc: 2.5, fbp: 2 };

function hasEmail(payload: string) {
  return /"[^"\s]+@[^"\s]+\.[a-z]{2,}"/i.test(payload);
}

function hasPhone(payload: string) {
  const re = /"(?:phone|telefone|cellphone|celular|mobile|phone_number|whatsapp)"\s*:\s*"?([^",}]*)/gi;
  for (let m = re.exec(payload); m; m = re.exec(payload)) if (m[1].replace(/\D/g, "").length >= 10) return true;
  return false;
}

export function capiQuality(rows: QualityRow[]): CapiQuality {
  const total = rows.length;
  let email = 0, phone = 0, fbc = 0, fbp = 0;
  for (const r of rows) {
    const p = r.payload || "";
    if (hasEmail(p)) email++;
    if (hasPhone(p)) phone++;
    if (r.fbc) fbc++;
    if (r.fbp) fbp++;
  }
  const share = (n: number) => (total ? n / total : 0);
  const score = total ? Math.round((share(email) * WEIGHTS.email + share(phone) * WEIGHTS.phone + share(fbc) * WEIGHTS.fbc + share(fbp) * WEIGHTS.fbp) * 10) / 10 : 0;
  const label = !total ? "Sem compras" : score >= 8 ? "Ótima" : score >= 6 ? "Boa" : score >= 4 ? "Regular" : "Fraca";
  const tips: string[] = [];
  if (total && share(fbc) < 0.5) tips.push("Poucas compras com fbc: confirme o script em todas as páginas e que o botão de compra é um link normal (o script leva o clique até o checkout).");
  if (total && share(fbp) < 0.5) tips.push("Poucas compras com fbp: o Pixel do navegador precisa carregar antes do checkout.");
  if (total && share(email) < 0.8) tips.push("Muitas compras sem e-mail: verifique se o gateway envia o e-mail do cliente no webhook.");
  if (total && share(phone) < 0.5) tips.push("Poucas compras com telefone: peça o telefone no checkout, se possível.");
  return { total, email, phone, fbc, fbp, score, label, tips };
}
