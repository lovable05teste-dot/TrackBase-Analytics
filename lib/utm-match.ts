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
    // `items` = todas as linhas da tela. Casamento por nome (UTM sem ID) só
    // vale quando UM único item tem aquele nome: campanhas duplicadas com o
    // mesmo nome recebiam os mesmos acessos/ICs, inclusive as que não rodaram.
    // idOnly: só conta evento cujo UTM traz o ID do Meta do item (sem nome).
    matchAll<I extends { id: string; name: string }>(items: I[], opts: { idOnly?: boolean } = {}): Map<string, { events: T[]; byName: number }> {
      const nameCount = new Map<string, number>();
      for (const item of items) {
        const key = item.name.trim().toLocaleLowerCase();
        nameCount.set(key, (nameCount.get(key) ?? 0) + 1);
      }
      const out = new Map<string, { events: T[]; byName: number }>();
      for (const item of items) {
        const found = new Set<T>(byId.get(item.id) ?? []);
        const key = item.name.trim().toLocaleLowerCase();
        let byNameCount = 0;
        if (!opts.idOnly && nameCount.get(key) === 1) for (const event of byName.get(key) ?? []) if (!found.has(event)) { found.add(event); byNameCount++; }
        out.set(item.id, { events: [...found], byName: byNameCount });
      }
      return out;
    },
  };
}

// Tráfego vindo do Meta: fbclid, utm_source do Facebook/Instagram/Meta (com
// ou sem sufixo de rastreamento) ou utm_campaign com ID de campanha.
const META_SOURCE = /^(facebook|fb|ig|instagram|meta|an|messenger|msg)(?=$|[^a-z]|jlj)/i;
const NOT_META_SOURCE = /^(tiktok|tt|tiktokads|tik_tok|google|gads|youtube|kwai)(?=$|[^a-z])/i;
export function isMetaTraffic(event: { fbclid?: string | null; utmSource?: string | null; utmCampaign?: string | null }) {
  if (String(event.fbclid ?? "").trim()) return true;
  // ID numérico na utm_campaign também aparece no TikTok (__CAMPAIGN_ID__).
  if (NOT_META_SOURCE.test(String(event.utmSource ?? "").trim())) return false;
  if (META_SOURCE.test(String(event.utmSource ?? "").trim())) return true;
  return parseUtm(event.utmCampaign).id !== null;
}

// Clique real num anúncio: a Meta põe `fbclid` em todo clique de anúncio, e o
// script/Pixel guardam o `_fbc` (fb.1.<tempo>.<fbclid>). Quem abre o link
// digitando as UTMs à mão (teste) não tem nenhum dos dois, então visitas e
// checkouts de teste não entram nas métricas das campanhas.
export function isAdClick(event: { fbclid?: string | null; fbc?: string | null }) {
  if (String(event.fbclid ?? "").trim()) return true;
  return /^fb\.\d+\.\d+\.\S+/.test(String(event.fbc ?? "").trim());
}
