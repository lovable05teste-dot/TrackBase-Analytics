import { metaConfig,metaJson } from "./meta";
import { decryptSecret } from "./trackbase-security";

export type MetaLevel="campaign"|"adset"|"ad";
export type LinkedAccount={id:string;adAccountId:string;accountName:string;currency:string|null;accessTokenCipher:string;accessTokenIv:string};
export async function accountToken(a:LinkedAccount){return decryptSecret(a.accessTokenCipher,a.accessTokenIv)}
export function graph(path:string,params:Record<string,string>,token:string){const q=new URLSearchParams({...params,access_token:token});return `https://graph.facebook.com/${metaConfig().version}/${path}?${q}`}
export const num=(v:unknown)=>{const n=Number(v||0);return Number.isFinite(n)?n:0};
export const norm=(v:unknown)=>String(v||"").split("|")[0].trim().toLowerCase();

export type DayInsight={date:string;itemId:string;itemName:string;spend:number;impressions:number;reach:number;frequency:number;clicks:number;ctr:number;cpc:number;cpm:number;purchases:number;revenue:number};
export async function adDailyInsights(token:string,adAccountId:string,since:string,until:string):Promise<DayInsight[]>{
 const fields="ad_id,ad_name,campaign_id,campaign_name,adset_id,adset_name,date_start,spend,impressions,reach,frequency,clicks,ctr,cpc,cpm,actions,action_values";
 const q={level:"ad",time_increment:"1",fields,limit:"500",time_range:JSON.stringify({since,until})};
 const body=await metaJson<{data:Array<Record<string,unknown>>}>(graph(`act_${adAccountId}/insights`,q as Record<string,string>,token));
 return (body.data||[]).map(r=>{
  const acts=Array.isArray(r.actions)?r.actions as Array<{action_type?:string;value?:string}>:[];
  const vals=Array.isArray(r.action_values)?r.action_values as Array<{action_type?:string;value?:string}>:[];
  const isP=(t?:string)=>!!t&&/purchase|offsite_conversion/i.test(t);
  const purchases=acts.filter(a=>isP(a.action_type)).reduce((s,a)=>s+num(a.value),0);
  const revenue=vals.filter(a=>isP(a.action_type)).reduce((s,a)=>s+num(a.value),0);
  return {date:String(r.date_start||""),itemId:String(r.ad_id||""),itemName:String(r.ad_name||""),spend:num(r.spend),impressions:num(r.impressions),reach:num(r.reach),frequency:num(r.frequency),clicks:num(r.clicks),ctr:num(r.ctr),cpc:num(r.cpc),cpm:num(r.cpm),purchases,revenue};
 });
}

export type AdTotal={id:string;name:string;campaignId:string;campaignName:string;adsetId:string;adsetName:string;spend:number;impressions:number;reach:number;frequency:number;clicks:number;ctr:number;cpc:number;cpm:number;purchases:number;revenue:number;quality:string|null;engagement:string|null;conversion:string|null;thruplay:number};
const QUAL=["quality_ranking","engagement_rate_ranking","conversion_rate_ranking"];
export async function adTotals(token:string,adAccountId:string,preset:string):Promise<AdTotal[]>{
 const fields=`ad_id,ad_name,campaign_id,campaign_name,adset_id,adset_name,spend,impressions,reach,frequency,clicks,ctr,cpc,cpm,actions,action_values,${QUAL.join(",")},video_thruplay_watched_actions`;
 const q={level:"ad",fields,limit:"500",date_preset:preset};
 const body=await metaJson<{data:Array<Record<string,unknown>>}>(graph(`act_${adAccountId}/insights`,q as Record<string,string>,token));
 return (body.data||[]).map(r=>{
  const acts=Array.isArray(r.actions)?r.actions as Array<{action_type?:string;value?:string}>:[];
  const vals=Array.isArray(r.action_values)?r.action_values as Array<{action_type?:string;value?:string}>:[];
  const isP=(t?:string)=>!!t&&/purchase|offsite_conversion/i.test(t);
  return {id:String(r.ad_id||""),name:String(r.ad_name||""),campaignId:String(r.campaign_id||""),campaignName:String(r.campaign_name||""),adsetId:String(r.adset_id||""),adsetName:String(r.adset_name||""),spend:num(r.spend),impressions:num(r.impressions),reach:num(r.reach),frequency:num(r.frequency),clicks:num(r.clicks),ctr:num(r.ctr),cpc:num(r.cpc),cpm:num(r.cpm),purchases:acts.filter(a=>isP(a.action_type)).reduce((s,a)=>s+num(a.value),0),revenue:vals.filter(a=>isP(a.action_type)).reduce((s,a)=>s+num(a.value),0),quality:(r.quality_ranking as string)||null,engagement:(r.engagement_rate_ranking as string)||null,conversion:(r.conversion_rate_ranking as string)||null,thruplay:num((r.video_thruplay_watched_actions as Array<{value?:string}>||[])[0]?.value)};
 });
}

export function isoDaysAgo(n:number){const d=new Date();d.setDate(d.getDate()-n);return d.toISOString().slice(0,10)}
export function rangeLast(n:number){return {since:isoDaysAgo(n),until:isoDaysAgo(1)}}
