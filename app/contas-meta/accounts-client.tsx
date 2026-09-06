"use client";
import { useEffect,useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2,ExternalLink,Loader2,RefreshCw } from "lucide-react";

type Account={id:string;adAccountId:string;name:string;currency?:string;timezoneName?:string;accountStatus?:number;selected:boolean;tokenExpiresAt?:number};

export function MetaAccountsClient(){
 const [data,setData]=useState<{configured:boolean;configIdConfigured:boolean;accounts:Account[]}|null>(null);const [error,setError]=useState("");const [saving,setSaving]=useState("");
 const load=async()=>{setError("");try{const r=await fetch("/api/meta/accounts");const b=await r.json();if(!r.ok)throw new Error(b.error);setData(b);}catch(e){setError(e instanceof Error?e.message:"Não foi possível carregar.");}};
 useEffect(()=>{load();},[]);
 const select=async(id:string)=>{setSaving(id);setError("");try{const r=await fetch("/api/meta/accounts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({accountId:id})});const b=await r.json();if(!r.ok)throw new Error(b.error);await load();}catch(e){setError(e instanceof Error?e.message:"Falha ao selecionar.");}finally{setSaving("");}};
 if(!data)return <div className="flex items-center gap-2 text-slate-400"><Loader2 className="size-4 animate-spin"/>Carregando conexão...</div>;
 return <div className="space-y-5">
   {!data.configured&&<div role="alert" className="rounded-lg border border-amber-400/25 bg-amber-400/10 p-4"><h3 className="font-medium text-amber-200">Aplicativo Meta precisa das credenciais</h3><p className="mt-2 text-sm leading-6 text-slate-300">Configure META_APP_ID e META_APP_SECRET no ambiente do servidor. META_LOGIN_CONFIG_ID é usado pelo Facebook Login for Business.</p></div>}
   {error&&<p role="alert" className="rounded-lg border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
   <div className="flex flex-wrap gap-3"><Button asChild disabled={!data.configured}><a href={data.configured?"/api/meta/oauth/start":"#"} target="_top"><ExternalLink/>{data.accounts.length?"Conectar outra conta Meta":"Continuar com Facebook"}</a></Button>{data.accounts.length>0&&<Button variant="outline" onClick={load}><RefreshCw/>Atualizar lista</Button>}</div>
   {data.accounts.length===0?<div className="rounded-xl border border-white/10 p-6 text-slate-400">Depois do login, as contas liberadas pela Meta aparecerão aqui para você escolher.</div>:<div className="grid gap-3">{data.accounts.map(a=><div key={a.id} className={`flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${a.selected?"border-violet-400/60 bg-violet-500/10":"border-white/10"}`}><div><div className="flex items-center gap-2"><strong>{a.name}</strong>{a.selected&&<span className="inline-flex items-center gap-1 text-sm text-emerald-300"><CheckCircle2 className="size-4"/>Conectada</span>}</div><p className="mt-1 text-sm text-slate-400">act_{a.adAccountId} · {a.currency||"Moeda não informada"} · {a.timezoneName||"Fuso não informado"}</p></div><Button variant={a.selected?"secondary":"default"} disabled={a.selected||saving===a.id} onClick={()=>select(a.id)}>{saving===a.id?<Loader2 className="animate-spin"/>:null}{a.selected?"Conta selecionada":"Usar esta conta"}</Button></div>)}</div>}
 </div>;
}
