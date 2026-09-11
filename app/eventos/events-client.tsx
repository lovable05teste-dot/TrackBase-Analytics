"use client";
import {useEffect,useMemo,useState} from "react";
import {Loader2,Search} from "lucide-react";

type Ev={id:string;eventName:string;source:string;occurredAt:number;projectName:string;utmCampaign?:string|null;utmSource?:string|null;value:number|null;currency:string|null};
const NAMES=["","AdClick","PageView","ViewContent","InitiateCheckout","AddToCart","Lead","Purchase","PageError"];
function when(ts:number){
  if(!Number.isFinite(Number(ts))||Number(ts)<=0)return "—";
  const ms=Number(ts)<1e12?Number(ts)*1000:Number(ts);
  const d=new Date(ms);
  return Number.isNaN(d.getTime())?"—":d.toLocaleString("pt-BR");
}
export function EventsClient(){
  const [rows,setRows]=useState<Ev[]>([]),[error,setError]=useState(""),[loading,setLoading]=useState(true);
  const [name,setName]=useState(""),[search,setSearch]=useState("");
  useEffect(()=>{let alive=true;setLoading(true);fetch("/api/events",{cache:"no-store"}).then(r=>r.json()).then(v=>{if(!alive)return;if(v.error)throw Error(v.error);setRows(Array.isArray(v.events)?v.events:[])}).catch(e=>{if(alive)setError(e instanceof Error?e.message:"Falha ao carregar eventos.")}).finally(()=>{if(alive)setLoading(false)}}return()=>{alive=false}},[]);
  const filtered=useMemo(()=>{const q=search.trim().toLocaleLowerCase();return rows.filter(r=>(!name||r.eventName===name)&&(!q||`${r.utmCampaign||""} ${r.projectName||""}`.toLocaleLowerCase().includes(q)))},[rows,name,search]);
  if(error)return <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-5 text-sm text-red-600 dark:text-red-300">{error}</p>;
  return <div className="space-y-4">
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[.02] md:grid-cols-[1.5fr_1fr]">
      <label className="relative block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar campanha ou projeto..." aria-label="Buscar eventos" className="dashboard-input h-11 pl-9"/></label>
      <select value={name} onChange={e=>setName(e.target.value)} aria-label="Filtrar por evento" className="dashboard-input h-11"><option value="">Todos os eventos</option>{NAMES.filter(Boolean).map(n=><option key={n} value={n}>{n}</option>)}</select>
    </div>
    <p className="text-xs text-slate-500" role="status">{loading?"Carregando eventos...":`${filtered.length} evento(s) · mais recentes primeiro`}</p>
    {loading?<div className="flex items-center gap-2 rounded-xl border border-slate-200 p-10 text-sm text-slate-500 dark:border-white/10"><Loader2 className="size-4 animate-spin"/>Carregando eventos...</div>:filtered.length===0?<div className="rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500 dark:border-white/10">{rows.length?"Nada encontrado com esses filtros.":"Nenhum evento recebido ainda."}</div>:<>
    <div className="hidden overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10 md:block"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr>{["Evento","Origem","Campanha","Projeto","Quando"].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{filtered.map(r=><tr key={r.id} className="border-t border-slate-200 dark:border-white/10"><td className="p-3 font-medium">{r.eventName}</td><td className="p-3 text-slate-500">{r.source}</td><td className="max-w-[240px] truncate p-3">{r.utmCampaign||"—"}</td><td className="max-w-[180px] truncate p-3">{r.projectName||"—"}</td><td className="whitespace-nowrap p-3 text-slate-500">{when(r.occurredAt)}</td></tr>)}</tbody></table></div>
    <div className="grid gap-3 md:hidden">{filtered.map(r=><div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[.03]"><div className="flex items-center justify-between gap-2"><b>{r.eventName}</b><span className="text-xs text-slate-500">{when(r.occurredAt)}</span></div><p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-300">{r.utmCampaign||"Sem campanha"} · {r.source}</p></div>)}</div>
    </>}
  </div>;
}
