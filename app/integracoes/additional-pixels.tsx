"use client";
import { useEffect, useState, type FormEvent } from "react";
import { Plus, Radio, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/plan-client";

type Pixel={id:string;pixelId:string;name:string;testCode:string|null};
const input="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";
export function AdditionalPixels({projectId}:{projectId:string}) {
  const [pixels,setPixels]=useState<Pixel[]>([]),[name,setName]=useState(""),[pixelId,setPixelId]=useState(""),[token,setToken]=useState(""),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const endpoint=`/api/project-pixels?projectId=${encodeURIComponent(projectId)}`;
  async function load(){const r=await fetch(endpoint,{cache:"no-store"}),b=await r.json();if(!r.ok)throw Error(b.error||"Falha ao carregar pixels.");setPixels(b.pixels)}
  useEffect(()=>{let alive=true;fetch(endpoint,{cache:"no-store"}).then(async r=>{const b=await r.json();if(!r.ok)throw Error(b.error||"Falha ao carregar pixels.");if(alive)setPixels(b.pixels)}).catch(e=>{if(alive)setError(e.message)});return()=>{alive=false}},[endpoint]);
  async function save(e:FormEvent){e.preventDefault();setBusy(true);setError("");try{const r=await apiFetch(endpoint,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name,pixelId,accessToken:token})}),b=await r.json();if(!r.ok)throw Error(b.error||"Falha ao salvar.");setToken("");setName("");setPixelId("");setOpen(false);await load()}catch(e){setError(e instanceof Error?e.message:"Falha ao salvar.")}finally{setBusy(false)}}
  async function remove(p:Pixel){if(!confirm(`Remover ${p.name} (${p.pixelId}) deste projeto?`))return;setBusy(true);setError("");try{const r=await apiFetch(`${endpoint}&id=${encodeURIComponent(p.id)}`,{method:"DELETE"}),b=await r.json();if(!r.ok)throw Error(b.error||"Falha ao remover.");await load()}catch(e){setError(e instanceof Error?e.message:"Falha ao remover.")}finally{setBusy(false)}}
  return <section className="space-y-3 rounded-xl border border-border p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="flex items-center gap-2 font-semibold"><Radio className="size-4"/>Mais pixels neste projeto</h4><p className="mt-1 text-xs text-muted-foreground">Cada pixel recebe os eventos do projeto. Os tokens ficam criptografados.</p></div><Button type="button" variant="outline" onClick={()=>setOpen(!open)}><Plus className="size-4"/>Adicionar pixel</Button></div>
    {pixels.map(p=><div key={p.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 p-3"><div className="min-w-0"><b className="block truncate text-sm">{p.name}</b><span className="text-xs text-muted-foreground">{p.pixelId} · configuração salva</span></div><Button type="button" variant="ghost" size="icon" disabled={busy} aria-label={`Remover ${p.name}`} onClick={()=>remove(p)}><Trash2 className="size-4 text-red-500"/></Button></div>)}
    {!pixels.length&&!open&&<p className="text-sm text-muted-foreground">Nenhum pixel adicional.</p>}
    {open&&<form onSubmit={save} className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Nome<input className={input} value={name} onChange={e=>setName(e.target.value)} maxLength={80} placeholder="Ex.: Pixel da segunda oferta" required/></label><label className="text-sm">ID do Pixel<input className={input} value={pixelId} onChange={e=>setPixelId(e.target.value.replace(/\D/g,""))} inputMode="numeric" pattern="[0-9]{6,25}" required/></label><label className="text-sm sm:col-span-2">Token da API de Conversões<input className={input} type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} maxLength={4096} required/></label><p className="text-xs text-muted-foreground sm:col-span-2">Use um token com acesso a este pixel. A entrega precisa ser conferida em Testar eventos na Meta.</p><Button disabled={busy}>{busy?"Salvando…":"Salvar pixel"}</Button></form>}
    {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}
  </section>;
}
