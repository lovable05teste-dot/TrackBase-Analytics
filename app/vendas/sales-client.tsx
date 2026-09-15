"use client";
import {useEffect,useMemo,useState} from "react";
import {ArrowDown,ArrowUp,ArrowUpDown,Download,Search,X} from "lucide-react";

type Sale={id:string;externalId:string;provider:string;status:string;value:number;currency:string;updatedAt:number;projectName:string;utmCampaign?:string|null;utmSource?:string|null;utmMedium?:string|null;utmContent?:string|null;utmTerm?:string|null};
// Cache de formatadores: evita recriar Intl.NumberFormat a cada célula (200 linhas).
const fmtCache=new Map<string,Intl.NumberFormat>();
const LIMIT=200;
const STATUS_LABEL:Record<string,string>={approved:"Aprovada",pending:"Pendente",refunded:"Reembolsada",cancelled:"Cancelada",chargeback:"Chargeback"};
const STATUS_DOT:Record<string,string>={approved:"bg-emerald-500",pending:"bg-amber-500",refunded:"bg-slate-400",cancelled:"bg-slate-400",chargeback:"bg-red-500"};
type SortKey="updatedAt"|"value"|"status";
const SORTABLE:{key:SortKey;label:string}[]=[{key:"updatedAt",label:"Atualizado"},{key:"value",label:"Valor"},{key:"status",label:"Status"}];

function money(value:number,currency:string){
  const v=Number(value);
  const cur=typeof currency==="string"&&/^[A-Z]{3}$/.test(currency)?currency:"BRL";
  const safe=Number.isFinite(v)?v:0;
  let fmt=fmtCache.get(cur);
  if(!fmt){try{fmt=new Intl.NumberFormat("pt-BR",{style:"currency",currency:cur})}catch{fmt=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"})}
    if(fmtCache.size>8)fmtCache.clear();
    fmtCache.set(cur,fmt)}
  try{return fmt.format(safe)}
  catch{return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(safe)}
}
function when(ts:number){
  if(!Number.isFinite(Number(ts))||Number(ts)<=0)return "—";
  const ms=Number(ts)<1e12?Number(ts)*1000:Number(ts);
  const d=new Date(ms);
  if(Number.isNaN(d.getTime()))return "—";
  return d.toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"});
}
function csvEscape(value:string){
  return /[",\n;]/.test(value)?`"${value.replace(/"/g,'""')}"`:value;
}
function exportCsv(rows:Sale[]){
  const header=["Pedido","Projeto","Gateway","Campanha","Status","Valor","Moeda","Atualizado"];
  const lines=rows.map(r=>[r.externalId,r.projectName||"",r.provider,r.utmCampaign||"",STATUS_LABEL[r.status]||r.status,String(r.value),r.currency,when(r.updatedAt)].map(csvEscape).join(";"));
  const csv=[header.join(";"),...lines].join("\n");
  const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=`vendas-${new Date().toISOString().slice(0,10)}.csv`;a.click();
  URL.revokeObjectURL(url);
}

export function SalesClient(){
  const [rows,setRows]=useState<Sale[]>([]),[error,setError]=useState(""),[loading,setLoading]=useState(true);
  const [search,setSearch]=useState(""),[status,setStatus]=useState("all"),[provider,setProvider]=useState("all"),[period,setPeriod]=useState("all");
  const [sortKey,setSortKey]=useState<SortKey>("updatedAt"),[sortDir,setSortDir]=useState<"asc"|"desc">("desc");
  const [detail,setDetail]=useState<Sale|null>(null);
  useEffect(()=>{let alive=true;setLoading(true);fetch("/api/orders",{cache:"no-store"}).then(r=>r.json()).then(v=>{if(!alive)return;if(v.error)throw Error(v.error);setRows(Array.isArray(v.orders)?v.orders:[])}).catch(e=>{if(alive)setError(e instanceof Error?e.message:"Falha ao carregar vendas.")}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false}},[]);
  const providers=useMemo(()=>Array.from(new Set(rows.map(r=>r.provider).filter(Boolean))).sort(),[rows]);
  const toggleSort=(key:SortKey)=>{if(key===sortKey)setSortDir(d=>d==="desc"?"asc":"desc");else{setSortKey(key);setSortDir("desc")}};
  const filtered=useMemo(()=>{
    const q=search.trim().toLocaleLowerCase();
    const nowFilter=Math.floor(Date.now()/1000);
    const minTs=period==="7d"?nowFilter-7*86400:period==="30d"?nowFilter-30*86400:0;
    const list=rows.filter(r=>(status==="all"||r.status===status)&&(provider==="all"||r.provider===provider)&&(!minTs||Number(r.updatedAt)>=minTs)&&(!q||`${r.externalId} ${r.utmCampaign||""} ${r.projectName||""}`.toLocaleLowerCase().includes(q)));
    const dir=sortDir==="asc"?1:-1;
    return list.sort((a,b)=>{
      if(sortKey==="value")return (Number(a.value)-Number(b.value))*dir;
      if(sortKey==="status")return a.status.localeCompare(b.status)*dir;
      return (Number(a.updatedAt)-Number(b.updatedAt))*dir;
    });
  },[rows,search,status,provider,period,sortKey,sortDir]);
  const approved=useMemo(()=>rows.filter(r=>r.status==="approved"),[rows]);
  const approvedTotal=approved.reduce((s,r)=>s+Number(r.value||0),0);
  const pendingCount=rows.filter(r=>r.status==="pending").length;
  const chargebackCount=rows.filter(r=>r.status==="chargeback").length;
  const ticket=approved.length?approvedTotal/approved.length:0;
  const cur=typeof rows[0]?.currency==="string"&&/^[A-Z]{3}$/.test(rows[0].currency)?rows[0].currency:"BRL";
  const stats:{label:string;value:string;sub:string;emphasis?:boolean}[]=[
    {label:"Receita aprovada",value:money(approvedTotal,cur),sub:`${approved.length} venda(s)`,emphasis:true},
    {label:"Ticket médio",value:money(ticket,cur),sub:"por venda aprovada"},
    {label:"Pendentes",value:String(pendingCount),sub:"aguardando aprovação"},
    {label:"Chargebacks",value:String(chargebackCount),sub:"últimos registros"},
  ];
  if(error)return <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-5 text-sm text-red-600 dark:text-red-300">{error}</p>;
  return <div className="min-w-0 space-y-4">
    <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-white/[.02] sm:grid-cols-4 sm:divide-y-0">
      {stats.map(s=><div key={s.label} className={`min-w-0 p-4 ${s.emphasis?"relative before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-red-500":""}`}>
        <p className="text-xs text-slate-500">{s.label}</p>
        <p className="mt-1 truncate text-xl font-semibold tabular-nums sm:text-2xl">{s.value}</p>
        <p className="mt-0.5 text-xs text-slate-400">{s.sub}</p>
      </div>)}
    </div>

    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[.02] lg:flex-row lg:items-center">
      <label className="relative block flex-1 lg:max-w-xs"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar pedido, campanha, projeto..." aria-label="Buscar vendas" className="dashboard-input h-10 pl-9"/></label>
      <div className="flex flex-wrap gap-3">
        <select value={status} onChange={e=>setStatus(e.target.value)} aria-label="Filtrar por status" className="dashboard-input h-10"><option value="all">Todos os status</option>{Object.entries(STATUS_LABEL).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
        <select value={provider} onChange={e=>setProvider(e.target.value)} aria-label="Filtrar por gateway" className="dashboard-input h-10"><option value="all">Todos os gateways</option>{providers.map(p=><option key={p} value={p}>{p}</option>)}</select>
        <select value={period} onChange={e=>setPeriod(e.target.value)} aria-label="Filtrar por período" className="dashboard-input h-10"><option value="all">Todo o período</option><option value="7d">Últimos 7 dias</option><option value="30d">Últimos 30 dias</option></select>
      </div>
      <button type="button" onClick={()=>exportCsv(filtered)} disabled={!filtered.length} className="dashboard-input flex h-10 items-center justify-center gap-2 px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 lg:ml-auto lg:w-auto"><Download className="size-4"/>Exportar CSV</button>
    </div>

    <p className="text-xs text-slate-500" role="status">{loading?"Carregando vendas...":`${filtered.length} venda(s)${rows.length>=LIMIT?" · mostrando as mais recentes (limite de 200)":""}`}</p>

    {loading?<div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
      {Array.from({length:6}).map((_,i)=><div key={i} className="flex items-center gap-4 border-t border-slate-100 p-3.5 first:border-t-0 dark:border-white/5"><div className="h-3.5 w-24 animate-pulse rounded bg-slate-200 dark:bg-white/10"/><div className="h-3.5 w-32 animate-pulse rounded bg-slate-200 dark:bg-white/10"/><div className="ml-auto h-3.5 w-20 animate-pulse rounded bg-slate-200 dark:bg-white/10"/></div>)}
    </div>:filtered.length===0?<div className="rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500 dark:border-white/10">{rows.length?"Nada encontrado com esses filtros.":"Nenhuma venda recebida ainda. Assim que o gateway enviar um webhook, ela aparece aqui."}</div>:<>
    <div className="hidden max-h-[70vh] overflow-auto rounded-xl border border-slate-200 dark:border-white/10 md:block">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#0e121d]">
          <tr className="text-slate-500 dark:text-slate-400">
            {["Pedido","Projeto","Gateway","Campanha"].map(h=><th key={h} className="border-b border-slate-200 p-3 text-left text-[11px] font-semibold uppercase tracking-wider dark:border-white/10">{h}</th>)}
            {SORTABLE.map(col=><th key={col.key} className={`border-b border-slate-200 p-3 text-[11px] font-semibold uppercase tracking-wider dark:border-white/10 ${col.key==="value"?"text-right":"text-left"}`}>
              <button type="button" onClick={()=>toggleSort(col.key)} className={`inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white ${col.key==="value"?"flex-row-reverse":""}`}>
                {col.label}
                {sortKey===col.key?(sortDir==="desc"?<ArrowDown className="size-3"/>:<ArrowUp className="size-3"/>):<ArrowUpDown className="size-3 opacity-30"/>}
              </button>
            </th>)}
            <th className="border-b border-slate-200 p-3 dark:border-white/10"><span className="sr-only">Detalhe</span></th>
          </tr>
        </thead>
        <tbody>{filtered.map(row=><tr key={row.id} onClick={()=>setDetail(row)} className="cursor-pointer border-t border-slate-100 transition hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5">
          <td className="max-w-[180px] truncate p-3 font-mono text-xs text-slate-500">{row.externalId}</td>
          <td className="max-w-[160px] truncate p-3">{row.projectName||"—"}</td>
          <td className="p-3 text-slate-500">{row.provider}</td>
          <td className="max-w-[200px] truncate p-3 text-slate-500">{row.utmCampaign||"—"}</td>
          <td className="whitespace-nowrap p-3"><span className="inline-flex items-center gap-2"><span className={`size-1.5 shrink-0 rounded-full ${STATUS_DOT[row.status]||STATUS_DOT.cancelled}`}/>{STATUS_LABEL[row.status]||row.status}</span></td>
          <td className="whitespace-nowrap p-3 text-right font-medium tabular-nums">{money(row.value,row.currency)}</td>
          <td className="whitespace-nowrap p-3 text-slate-500 tabular-nums">{when(row.updatedAt)}</td>
          <td className="p-3 text-right text-xs text-slate-400">Ver</td>
        </tr>)}</tbody>
      </table>
    </div>
    <div className="grid gap-3 md:hidden">{filtered.map(row=><button key={row.id} onClick={()=>setDetail(row)} className="rounded-xl border border-slate-200 bg-white p-4 text-left active:scale-[.99] dark:border-white/10 dark:bg-white/[.03]"><div className="flex items-center justify-between gap-2"><span className="font-mono text-xs text-slate-500">{row.externalId}</span><span className="inline-flex items-center gap-1.5 text-xs font-medium"><span className={`size-1.5 rounded-full ${STATUS_DOT[row.status]||STATUS_DOT.cancelled}`}/>{STATUS_LABEL[row.status]||row.status}</span></div><div className="mt-2 flex items-end justify-between gap-2"><b className="text-lg tabular-nums">{money(row.value,row.currency)}</b><span className="text-xs text-slate-500">{when(row.updatedAt)}</span></div><p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-300">{row.utmCampaign||"Sem campanha"} · {row.provider}</p></button>)}</div>
    </>}
    {detail?<div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label="Detalhe da venda"><div className="absolute inset-0 bg-black/60" onClick={()=>setDetail(null)}/><div className="relative max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-6 text-slate-900 dark:border-white/10 dark:bg-[#101521] dark:text-slate-100 sm:rounded-3xl"><div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-xs text-slate-500">Pedido</p><b className="break-all font-mono text-sm">{detail.externalId}</b></div><button onClick={()=>setDetail(null)} aria-label="Fechar detalhe" className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"><X className="size-4"/></button></div><div className="grid grid-cols-2 gap-3 text-sm">{[["Status",STATUS_LABEL[detail.status]||detail.status],["Valor",money(detail.value,detail.currency)],["Gateway",detail.provider],["Projeto",detail.projectName||"—"],["Campanha",detail.utmCampaign||"—"],["Origem",detail.utmSource||"—"],["Meio",detail.utmMedium||"—"],["Conteúdo",detail.utmContent||"—"],["Conjunto",detail.utmTerm||"—"],["Atualizado",when(detail.updatedAt)]].map(([k,v])=><div key={k} className="rounded-lg bg-slate-50 p-3 dark:bg-white/[.03]"><p className="text-xs text-slate-500">{k}</p><p className="mt-1 break-words font-medium">{v}</p></div>)}</div></div></div>:null}
  </div>;
}
