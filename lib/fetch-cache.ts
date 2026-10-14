// Cache curto em memória para os GETs do dashboard. Trocar de período e voltar
// dentro de alguns segundos não refaz as consultas pesadas (Meta e TikTok).
// Só respostas de sucesso entram no cache, e o botão de atualizar limpa tudo.
const TTL_MS = 30_000;
const cache = new Map<string, { at: number; body: string }>();

export function cachedGet(url: string, signal?: AbortSignal): Promise<Response> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return Promise.resolve(new Response(hit.body, { status: 200, headers: { "content-type": "application/json" } }));
  }
  return fetch(url, { cache: "no-store", signal }).then(async (res) => {
    if (res.ok) {
      const body = await res.clone().text();
      cache.set(url, { at: Date.now(), body });
    }
    return res;
  });
}

export function clearFetchCache() {
  cache.clear();
}
