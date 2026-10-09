// Liga eventos (utm_campaign / utm_term / utm_medium / utm_content) às
// campanhas, conjuntos e anúncios da Meta com igualdade EXATA.
// Antes era "contém": a campanha "Produto X" pegava eventos de
// "Produto X 2", e campanhas que nunca rodaram apareciam com IC/vendas.
//   "Nome|120211234567890" → casa só pelo ID
//   "Nome"                 → casa só pelo nome inteiro (sem maiúsculas)

export type UtmKey = { id: string | null; name: string | null };

export function parseUtm(raw: unknown): UtmKey {
  const value = String(raw ?? "").trim();
  if (!value || /\{\{|\}\}/.test(value)) return { id: null, name: null };
  const parts = value.split("|").map((part) => part.trim()).filter(Boolean);
  const id = parts.find((part) => /^\d{6,}$/.test(part)) ?? null;
  const name = parts.find((part) => part !== id)?.toLocaleLowerCase() ?? null;
  return { id, name };
}

// Índice id/nome → itens, para casar cada evento em O(1).
export function buildUtmIndex<T>(events: T[], keysOf: (event: T) => unknown[]) {
  const byId = new Map<string, Set<T>>();
  const byName = new Map<string, Set<T>>();
  const add = (map: Map<string, Set<T>>, key: string, event: T) => {
    let set = map.get(key);
    if (!set) map.set(key, (set = new Set()));
    set.add(event);
  };
  for (const event of events) {
    for (const raw of keysOf(event)) {
      const { id, name } = parseUtm(raw);
      if (id) add(byId, id, event);
      else if (name) add(byName, name, event);
    }
  }
  return {
    match(item: { id: string; name: string }): T[] {
      const found = new Set<T>(byId.get(item.id) ?? []);
      for (const event of byName.get(item.name.trim().toLocaleLowerCase()) ?? []) found.add(event);
      return [...found];
    },
  };
}
