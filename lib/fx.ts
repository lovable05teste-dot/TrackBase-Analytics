// Cotação para converter gasto de contas em outra moeda (ex.: USD) para BRL.
// Cache de 6 h por instância; se a cotação falhar, retorna null e o valor
// fica na moeda original (sinalizado na resposta).
const cache = new Map<string, { rate: number; at: number }>();
const TTL = 6 * 3600 * 1000;

export async function rateToBrl(currency: string | null | undefined): Promise<number | null> {
  const cur = String(currency || "BRL").toUpperCase();
  if (cur === "BRL") return 1;
  const hit = cache.get(cur);
  if (hit && Date.now() - hit.at < TTL) return hit.rate;
  const sources = [
    async () => (await (await fetch(`https://open.er-api.com/v6/latest/${cur}`, { signal: AbortSignal.timeout(5000) })).json())?.rates?.BRL,
    async () => (await (await fetch(`https://api.frankfurter.app/latest?from=${cur}&to=BRL`, { signal: AbortSignal.timeout(5000) })).json())?.rates?.BRL,
  ];
  for (const get of sources) {
    try {
      const rate = Number(await get());
      if (Number.isFinite(rate) && rate > 0) { cache.set(cur, { rate, at: Date.now() }); return rate; }
    } catch {}
  }
  return hit?.rate ?? null;
}
