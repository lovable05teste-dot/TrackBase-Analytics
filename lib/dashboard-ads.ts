import {brYmd} from "./br-time";
export type DashboardAds={unavailable?:boolean;dailyComplete?:boolean;metaLinkClicks?:number;campaigns:Array<{spend:number;clicks:number;impressions?:number;linkClicks?:number}>;daily:Array<{date:string;spend:number}>};
// Falha de importação nunca equivale a gasto zero.
export async function loadDashboardAds(q:URLSearchParams,signal:AbortSignal):Promise<{meta:DashboardAds;warning:string}>{
 const results=await Promise.all(["meta","tiktok"].map(async provider=>{
  try{const r=await fetch(`/api/${provider}/campaigns?${q}`,{cache:"no-store",signal});const b=await r.json();
   if(!r.ok||b.failures?.length)throw Error(b.error||b.failures?.map((f:{account:string;error:string})=>`${f.account}: ${f.error}`).join("; ")||"Falha ao importar anúncios.");
   const rows=provider==="meta"?b.campaigns:b.items;if(!Array.isArray(rows)||rows.some((i:{spend:number})=>!Number.isFinite(i.spend)))throw Error("Relatório de anúncios inválido.");
   return {rows:rows as DashboardAds["campaigns"],daily:provider==="meta"&&Array.isArray(b.daily)?b.daily:[],complete:provider==="meta"||b.accounts===0,accounts:Number(b.accounts||0),error:""};
  }catch(e){if(signal.aborted)throw e;return {rows:[],daily:[],complete:false,accounts:0,error:`${provider=== "meta"?"Meta":"TikTok"}: ${e instanceof Error?e.message:"Falha na importação"}`}}
 }));
 const period=q.get("period"),today=brYmd(),end=period==="custom"?q.get("end"): ["today","last_7d","last_30d","this_month"].includes(period||"")?today:null;
 const partialComparison=q.get("compare")==="1"&&end===today&&results.some(r=>r.accounts>0);
 const comparisonWarning=partialComparison?"Comparação financeira indisponível: a receita compara até o mesmo horário e os anúncios fornecem dias completos.":"";
 return {meta:{campaigns:results.flatMap(r=>r.rows),daily:results.flatMap(r=>r.daily),unavailable:partialComparison||results.some(r=>!!r.error),dailyComplete:results.every(r=>r.complete),metaLinkClicks:results[0].rows.reduce((sum,i)=>sum+(i.linkClicks||i.clicks||0),0)},warning:[comparisonWarning,...results.map(r=>r.error)].filter(Boolean).join(" · ")};
}
