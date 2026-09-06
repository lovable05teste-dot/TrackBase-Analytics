"use client";
import {useEffect,useState} from "react";
import {Check,Copy,Loader2,Plus} from "lucide-react";
import {Button} from "@/components/ui/button";
type Project={id:string;name:string;domain?:string;publicKey?:string};
export function TrackingInstall(){const[projects,setProjects]=useState<Project[]>([]),[name,setName]=useState("Minha página de vendas"),[domain,setDomain]=useState(""),[loading,setLoading]=useState(true),[creating,setCreating]=useState(false),[copied,setCopied]=useState("");
 const load=()=>fetch("/api/projects").then(r=>r.json()).then(b=>setProjects(b.projects||[])).finally(()=>setLoading(false));useEffect(()=>{load()},[]);
 const create=async()=>{setCreating(true);try{const r=await fetch("/api/projects",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name,domain})}),b=await r.json();if(!r.ok)throw new Error(b.error);await load()}finally{setCreating(false)}};
 const script=(p:Project)=>`<script async src="${location.origin}/tracker.js?key=${p.publicKey}"></script>`;
 const copy=async(p:Project)=>{await navigator.clipboard.writeText(script(p));setCopied(p.id);setTimeout(()=>setCopied(""),1600)};
 return <div className="space-y-5 border-t border-white/10 pt-6"><div><h3 className="font-semibold">Script de rastreamento da página</h3><p className="mt-1 text-sm text-slate-400">Instale antes do fechamento de &lt;/head&gt;. Ele registra clique do anúncio, PageView, ViewContent e InitiateCheckout nos botões de compra.</p></div>
 {loading?<Loader2 className="animate-spin"/>:<>{projects.map(p=><div key={p.id} className="rounded-xl border border-white/10 p-4"><b>{p.name}</b>{p.domain&&<span className="ml-2 text-xs text-slate-500">{p.domain}</span>}<code className="my-3 block break-all rounded-lg bg-black/30 p-3 text-xs text-sky-300">{script(p)}</code><Button variant="outline" onClick={()=>copy(p)}>{copied===p.id?<Check/>:<Copy/>}{copied===p.id?"Copiado":"Copiar script"}</Button></div>)}<div className="grid gap-3 rounded-xl border border-dashed border-white/15 p-4 sm:grid-cols-[1fr_1fr_auto]"><input value={name} onChange={e=>setName(e.target.value)} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2" placeholder="Nome do projeto"/><input value={domain} onChange={e=>setDomain(e.target.value)} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2" placeholder="seudominio.com"/><Button onClick={create} disabled={creating||!name.trim()}>{creating?<Loader2 className="animate-spin"/>:<Plus/>}Criar projeto</Button></div></>}
 </div>}
