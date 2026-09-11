"use client";
import {useEffect,useMemo,useState} from "react";
import {ChevronDown,Loader2,Search,X} from "lucide-react";

type Sale={id:string;externalId:string;provider:string;status:string;value:number;currency:string;updatedAt:number;projectName:string;utmCampaign?:string|null;utmSource?:string|null;utmMedium?:string|null;utmContent?:string|null;utmTerm?:string|null};
const LIMIT=200;
const STATUS_LABEL:Record<string,string>={approved:"Aprovada",pending:"Pendente",refunded:"Reembolsada",cancelled:"Cancelada",chargeback:"Chargeback"};
const STATUS_TONE:Record<string,string>={approved:"bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",pending:"bg-amber-500/15 text-amber-700 dark:text-amber-300",refunded:"bg-slate-500/15 text-slate-600 dark:text-slate-300",cancelled:"bg-slate-500/15 text-slate-600 dark:text-slate-300",chargeback:"bg-red-500/15 text-red-600 dark:text-red-300"};

function money(value:number,currency:string){
  const v=Number(value);
  const cur=typeof currency==="string"&&/^[A-Z]{3}$/.test(currency)?currency:"BRL";
  try{return new Intl.NumberFormat("pt-BR",{style:"currency",currency:cur}).format(Number.isFinite(v)?v:0)}
  catch{return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number.isFinite(v)?v:0)}
}
function when(ts:number){
  if(!Number.isFinite(Number(ts))||Number(ts)<=0)return "—";
  const ms=Number(ts)<1e12?Number(ts)*1000:Number(ts);
  const d=new Date(ms);
  if(Number.isNaN(d.getTime()))return "—";
  return d.toLocaleString("pt-BR");
}

export function SalesClient(){
  const [rows,setRows]=useState<Sale[]>([]),[error,setError]=useState(""),[loading,setLoading]=useState(true);
  const [search,setSearch]=useState(""),[status,setStatus]=useState("all"),[provider,setProvider]=useState("all"),[period,setPeriod]=useState("all");
  const [detail,setDetail]=useState<Sale|null>(null);
  useEffect(()=>{let alive=true;setLoading(true);fetch("/api/orders",{cache:"no-store"}).then(r=>r.json()).then(v=>{if(!alive)return;if(v.error)throw Error(v.error);setRows(Array.isArray(v.orders)?v.orders:[])}).catch(e=>{if(alive)setError(e instanceof Error?e.message:"Falha ao carregar vendas.")}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false}},[]);
  const providers=useMemo(()=>Array.from(new Set(rows.map(r=>r.provider).filter(Boolean))).sort(),[rows]);
  const filtered=useMemo(()=>{
    const q=search.trim().toLocaleLowerCase(),now=Math.floor(Date.now()/1000);
    const minTs=period==="7d"?now-7*86400:period==="30d"?now-30*86400:0;
    return rows.filter(r=>(status==="all"||r.status===status)&&(provider==="all"||r.provider===provider)&&(!minTs||Number(r.updatedAt)>=minTs)&&(!q||`${r.externalId} ${r.utmCampaign||""} ${r.projectName||""}`.toLocaleLowerCase().includes(q)));
  },[rows,search,status,provider,period]);
  const approved=useMemo(()=>rows.filter(r=>r.status==="approved"),[rows]);
  const approvedTotal=approved.reduce((s,r)=>s+Number(r.value||0),0);
  const pendingCount=rows.filter(r=>r.status==="pending").length;
  const ticket=approved.length?approvedTotal/approved.length:0;
  const cur=typeof rows[0]?.currency==="string"&&/^[A-Z]{3}$/.test(rows[0].currency)?rows[0].currency:"BRL";
  if(error)return <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-5 text-sm text-red-600 dark:text-red-300">{error}</p>;
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-3">{[["Receita aprovada",money(approvedTotal,cur),`${approved.length} venda(s)`],["Pendentes",String(pendingCount),"aguardando aprovação"],["Ticket médio",money(ticket,cur),"por venda aprovada"]].map(([k,v,s],i)=><div key={k} className={`relative overflow-hidden rounded-xl border p-4 ${i===0?"border-red-500/25 bg-gradient-to-br from-red-500/[.09] to-transparent dark:from-red-500/[.14]":"border-slate-200 bg-white dark:border-white/10 dark:bg-white/[.02]"}`}><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{k}</p><p className="mt-1 text-2xl font-bold tabular-nums">{v}</p><p className="mt-0.5 text-xs text-slate-500">{s}</p></div>)}</div>
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[.02] md:grid-cols-[1.4fr_1fr_1fr_1fr]">
      <label className="relative block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar pedido, campanha, projeto..." aria-label="Buscar vendas" className="dashboard-input h-11 pl-9"/></label>
      <select value={status} onChange={e=>setStatus(e.target.value)} aria-label="Filtrar por status" className="dashboard-input h-11"><option value="all">Todos os status</option>{Object.entries(STATUS_LABEL).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
      <select value={provider} onChange={e=>setProvider(e.target.value)} aria-label="Filtrar por gateway" className="dashboard-input h-11"><option value="all">Todos os gateways</option>{providers.map(p=><option key={p} value={p}>{p}</option>)}</select>
      <select value={period} onChange={e=>setPeriod(e.target.value)} aria-label="Filtrar por período" className="dashboard-input h-11"><option value="all">Todo o período</option><option value="7d">Últimos 7 dias</option><option value="30d">Últimos 30 dias</option></select>
    </div>
    <p className="text-xs text-slate-500" role="status">{loading?"Carregando vendas...":`${filtered.length} venda(s)${rows.length>=LIMIT?" · mostrando as mais recentes (limite de 200)":""}`}</p>
    {loading?<div className="flex items-center gap-2 rounded-xl border border-slate-200 p-10 text-sm text-slate-500 dark:border-white/10"><Loader2 className="size-4 animate-spin"/>Carregando vendas...</div>:filtered.length===0?<div className="rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500 dark:border-white/10">{rows.length?"Nada encontrado com esses filtros.":"Nenhuma venda recebida."}</div>:<>
    <div className="hidden overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10 md:block"><table className="w-full min-w-[980px] text-left text-sm"><thead><tr className="bg-slate-50/80 text-slate-600 dark:bg-white/[.03] dark:text-slate-400">{["Pedido","Projeto","Gateway","Campanha","Status","Valor","Atualizado",""].map(h=><th key={h} className="p-3 text-left text-[11px] font-semibold uppercase tracking-wider">{h}</th>)}</tr></thead><tbody>{filtered.map(row=><tr key={row.id} onClick={()=>setDetail(row)} className="cursor-pointer border-t border-slate-200 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"><td className="max-w-[180px] truncate p-3 font-mono text-xs">{row.externalId}</td><td className="max-w-[160px] truncate p-3">{row.projectName||"—"}</td><td className="p-3">{row.provider}</td><td className="max-w-[200px] truncate p-3">{row.utmCampaign||"—"}</td><td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_TONE[row.status]||STATUS_TONE.cancelled}`}>{STATUS_LABEL[row.status]||row.status}</span></td><td className="whitespace-nowrap p-3 font-medium">{money(row.value,row.currency)}</td><td className="whitespace-nowrap p-3 text-slate-500">{when(row.updatedAt)}</td><td className="p-3 text-slate-400"><ChevronDown className="size-4 -rotate-90"/></td></tr>)}</tbody></table></div>
    <div className="grid gap-3 md:hidden">{filtered.map(row=><button key={row.id} onClick={()=>setDetail(row)} className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm active:scale-[.99] dark:border-white/10 dark:bg-white/[.03]"><div className="flex items-center justify-between gap-2"><span className="font-mono text-xs text-slate-500">{row.externalId}</span><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_TONE[row.status]||STATUS_TONE.cancelled}`}>{STATUS_LABEL[row.status]||row.status}</span></div><div className="mt-2 flex items-end justify-between gap-2"><b className="text-lg">{money(row.value,row.currency)}</b><span className="text-xs text-slate-500">{when(row.updatedAt)}</span></div><p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-300">{row.utmCampaign||"Sem campanha"} · {row.provider}</p></button>)}</div>
    </>}
    {detail?<div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label="Detalhe da venda"><div className="absolute inset-0 bg-black/60" onClick={()=>setDetail(null)}/><div className="relative max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-6 text-slate-900 dark:border-white/10 dark:bg-[#101521] dark:text-slate-100 sm:rounded-3xl"><div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-xs text-slate-500">Pedido</p><b className="break-all font-mono text-sm">{detail.externalId}</b></div><button onClick={()=>setDetail(null)} aria-label="Fechar detalhe" className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"><X className="size-4"/></button></div><div className="grid grid-cols-2 gap-3 text-sm">{[["Status",STATUS_LABEL[detail.status]||detail.status],["Valor",money(detail.value,detail.currency)],["Gateway",detail.provider],["Projeto",detail.projectName||"—"],["Campanha",detail.utmCampaign||"—"],["Origem",detail.utmSource||"—"],["Meio",detail.utmMedium||"—"],["Conteúdo",detail.utmContent||"—"],["Conjunto",detail.utmTerm||"—"],["Atualizado",when(detail.updatedAt)]].map(([k,v])=><div key={k} className="rounded-lg bg-slate-50 p-3 dark:bg-white/[.03]"><p className="text-xs text-slate-500">{k}</p><p className="mt-1 break-words font-medium">{v}</p></div>)}</div></div></div>:null}
  </div>;
}
