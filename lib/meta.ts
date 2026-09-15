type MetaEnv = { META_APP_ID?: string; META_APP_SECRET?: string; META_LOGIN_CONFIG_ID?: string; META_GRAPH_VERSION?: string };

export function metaRedirectUri() {
  // OAuth da Meta exige igualdade literal. Nunca derive do Host, preview,
  // APP_URL, www/sem-www ou protocolo recebido pela requisição.
  return "https://www.ghostscale.com.br/api/meta/oauth/callback";
}

export async function metaPages<T>(url: string): Promise<{ data: T[] }> {
  const data: T[] = [];
  const seen = new Set<string>();
  let next: string | undefined = url;
  while (next) {
    const parsed = new URL(next);
    if (parsed.origin !== "https://graph.facebook.com" || seen.has(next) || seen.size >= 100) throw new Error("META_PAGINATION_INCOMPLETE");
    seen.add(next);
    const page: { data: T[]; paging?: { next?: string } } = await metaJson(next);
    data.push(...page.data);
    next = page.paging?.next;
  }
  return { data };
}

export function metaConfig() {
  const values=process.env as MetaEnv;
  return {appId:values.META_APP_ID?.trim()||"",appSecret:values.META_APP_SECRET?.trim()||"",configId:values.META_LOGIN_CONFIG_ID?.trim()||"",version:values.META_GRAPH_VERSION?.trim()||"v25.0",redirectUri:metaRedirectUri()};
}

export function requireMetaConfig() {
  const config=metaConfig();
  if(!config.appId||!config.appSecret) throw new Error("META_NOT_CONFIGURED");
  return config;
}

export async function metaJson<T>(url:string, init?:RequestInit):Promise<T>{
  const response=await fetch(url,{...init,cache:"no-store",signal:init?.signal ?? AbortSignal.timeout(15000)});
  const body=await response.json() as T & {error?:{message?:string;code?:number}};
  if(!response.ok||(body as {error?:unknown}).error) throw new Error((body as {error?:{message?:string}}).error?.message||"A Meta recusou a solicitação.");
  return body;
}
