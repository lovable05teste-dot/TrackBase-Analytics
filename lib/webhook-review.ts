// Validação leve do que chega no webhook do gateway. Nada é rejeitado: o
// gateway reenviaria o mesmo pedido e a venda poderia ser perdida. Em vez
// disso, o pedido é gravado e marcado para revisão, com o motivo.
import { z } from "zod";
import { parseMoney } from "@/lib/sale-ingest";

export type AmountRead = { value: number; source: "explicit" | "missing" | "invalid" };

const amountInput = z.union([z.number(), z.string().trim().min(1)]);

// Valor vindo do payload (número ou texto em formato brasileiro ou inglês).
export function readAmount(raw: unknown): AmountRead {
  if (raw === undefined || raw === null || raw === "") return { value: 0, source: "missing" };
  const parsed = amountInput.safeParse(raw);
  // parseMoney devolve 0 para texto sem número: isso precisa ser marcado, não aceito.
  if (!parsed.success || (typeof parsed.data === "string" && !/\d/.test(parsed.data))) return { value: 0, source: "invalid" };
  const value = parseMoney(parsed.data);
  if (!Number.isFinite(value) || value < 0) return { value: 0, source: "invalid" };
  return { value, source: "explicit" };
}

export function reviewNote(input: { idFromProvider: boolean; knownStatus: boolean; amount: AmountRead }): string | null {
  const notes: string[] = [];
  if (!input.idFromProvider) notes.push("ID do pedido não veio no webhook; conferir no gateway");
  if (!input.knownStatus) notes.push("status desconhecido; gravado como pendente");
  if (input.amount.source === "missing") notes.push("valor não veio no webhook; gravado como 0");
  if (input.amount.source === "invalid") notes.push("valor ilegível no webhook; gravado como 0");
  return notes.length ? notes.join("; ") : null;
}
