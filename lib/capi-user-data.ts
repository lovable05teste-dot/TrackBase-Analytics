// user_data das compras enviadas à API de Conversões (sem dependências:
// importável nos testes).
// Telefone no formato que a Meta espera: só dígitos, com DDI. Número
// brasileiro sem o 55 (10/11 dígitos) não casava com ninguém.
export function normalizePhone(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "").replace(/^0+/, "");
  if (!digits) return "";
  return (digits.length === 10 || digits.length === 11) && !digits.startsWith("55") ? `55${digits}` : digits;
}

async function sha256Hex(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// user_data da compra: e-mail, telefone, nome e ID do visitante com hash;
// IP/navegador/fbc/fbp da visita real (fallback: o que veio no webhook).
export async function purchaseUserData(input: { email?: unknown; phone?: unknown; name?: unknown; visitorId?: string; ip?: string; ua?: string; fbc?: string; fbp?: string; fallbackUa?: string }) {
  const h = async (v: string) => (v ? sha256Hex(v) : undefined);
  const email = String(input.email || "").trim().toLowerCase().replace(/\s+/g, "");
  const parts = String(input.name || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  return {
    client_ip_address: input.ip || undefined,
    client_user_agent: input.ua || input.fallbackUa || undefined,
    em: await h(email.includes("@") ? email : ""),
    ph: await h(normalizePhone(input.phone)),
    fn: await h(parts[0] || ""),
    ln: await h(parts.length > 1 ? parts[parts.length - 1] : ""),
    external_id: await h(input.visitorId || ""),
    fbc: input.fbc || undefined,
    fbp: input.fbp || undefined,
  };
}
