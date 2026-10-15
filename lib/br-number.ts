// Número digitado num campo de formulário, no formato brasileiro ("1.234,56",
// "R$ 97", "1234,5") ou no formato com ponto ("1234.56"). Vazio ou inválido
// vira 0. Antes, "1000,50" virava 0 em silêncio em algumas ferramentas.
export function parseBrNumber(raw: string | number | null | undefined): number {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  let v = String(raw ?? "").trim().replace(/\s|R\$/gi, "");
  if (!v) return 0;
  if (v.includes(",")) v = v.replace(/\./g, "").replace(",", ".");
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
