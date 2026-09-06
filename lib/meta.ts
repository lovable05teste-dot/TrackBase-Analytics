import { env } from "cloudflare:workers";

type MetaEnv = { META_APP_ID?: string; META_APP_SECRET?: string; META_LOGIN_CONFIG_ID?: string; META_GRAPH_VERSION?: string };

export function metaConfig() {
  const values=env as unknown as MetaEnv;
  return {appId:values.META_APP_ID?.trim()||"",appSecret:values.META_APP_SECRET?.trim()||"",configId:values.META_LOGIN_CONFIG_ID?.trim()||"",version:values.META_GRAPH_VERSION?.trim()||"v25.0"};
}

export function requireMetaConfig() {
  const config=metaConfig();
  if(!config.appId||!config.appSecret) throw new Error("META_NOT_CONFIGURED");
  return config;
}

export async function metaJson<T>(url:string, init?:RequestInit):Promise<T>{
  const response=await fetch(url,init);
  const body=await response.json() as T & {error?:{message?:string;code?:number}};
  if(!response.ok||(body as {error?:unknown}).error) throw new Error((body as {error?:{message?:string}}).error?.message||"A Meta recusou a solicitação.");
  return body;
}
