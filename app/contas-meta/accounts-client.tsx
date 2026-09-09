"use client";
import { useEffect,useState } from "react";
import { Button } from "@/components/ui/button";
import { Check,CheckCircle2,Copy,ExternalLink,Loader2,RefreshCw } from "lucide-react";

type Account={id:string;adAccountId:string;name:string;metaUserName?:string;currency?:string;timezoneName?:string;accountStatus?:number;selected:boolean;tokenExpiresAt?:number};

export function MetaAccountsClient(){
 const [data,setData]=useState<{configured:boolean;configIdConfigured:boolean;accounts:Account[]}|null>(null);const [error,setError]=useState("");const [saving,setSaving]=useState("");const [copied,setCopied]=useState(false);
 const readJson=async(r:Response)=>{const text=await r.text();if(!text)throw new Error(`A API não respondeu (${r.status}).`);try{return JSON.parse(text)}catch{throw new Error(`Resposta inválida da API (${r.status}).`)}};
 const load=async()=>{setError("");const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);try{const r=await fetch("/api/meta/accounts",{signal:controller.signal});const b=await readJson(r);if(!r.ok)throw new Error(b.error||"Falha ao carregar contas.");setData(b);}catch(e){setError(e instanceof DOMException&&e.name==="AbortError"?"A lista de contas demorou para responder. Você ainda pode iniciar uma nova conexão.":e instanceof Error?e.message:"Não foi possível carregar.");}finally{clearTimeout(timer)}};
 useEffect(()=>{load();},[]);
 const select=async(account:Account)=>{setSaving(account.id);setError("");try{const r=await fetch("/api/meta/accounts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({accountId:account.id,enabled:!account.selected})});const b=await readJson(r);if(!r.ok)throw new Error(b.error||"Falha ao vincular.");await load();}catch(e){setError(e instanceof Error?e.message:"Falha ao vincular.");}finally{setSaving("");}};
 const accounts=data?.accounts||[];const configured=data?.configured!==false;
 const copyLink=async()=>{await navigator.clipboard.writeText(`${location.origin}/api/meta/oauth/start`);setCopied(true);setTimeout(()=>setCopied(false),1800)};
 return <div className="space-y-5">
   {data&&!configured&&<div role="alert" className="rounded-lg border border-amber-400/25 bg-amber-400/10 p-4"><h3 className="font-medium text-amber-200">Aplicativo Meta precisa das credenciais</h3><p className="mt-2 text-sm leading-6 text-slate-300">Configure META_APP_ID e META_APP_SECRET no ambiente do servidor. META_LOGIN_CONFIG_ID é usado pelo Facebook Login for Business.</p></div>}
   {error&&<p role="alert" className="rounded-lg border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
   <div className="flex flex-wrap gap-3"><Button asChild><a href="/api/meta/oauth/start" target="_top"><ExternalLink/>{accounts.length?"Conectar outra conta Meta":"Continuar com Facebook"}</a></Button><Button variant="outline" onClick={copyLink}>{copied?<Check/>:<Copy/>}{copied?"Link copiado":"Copiar link de conexão"}</Button>{accounts.length>0&&<Button variant="outline" onClick={load}><RefreshCw/>Atualizar lista</Button>}</div>
   {!data&&!error&&<div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="size-4 animate-spin"/>Buscando contas já conectadas...</div>}
   {accounts.length===0?<div className="rounded-xl border border-white/10 p-6 text-slate-400">Abra o botão acima neste navegador ou copie o link para um perfil do AdsPower. Depois da autorização, as contas liberadas pela Meta aparecerão aqui.</div>:<div className="grid gap-3">{accounts.map(a=><div key={a.id} className={`flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${a.selected?"border-violet-400/60 bg-violet-500/10":"border-white/10"}`}><div><div className="flex items-center gap-2"><strong>{a.name}</strong>{a.selected&&<span className="inline-flex items-center gap-1 text-sm text-emerald-300"><CheckCircle2 className="size-4"/>Vinculada</span>}</div>{a.metaUserName&&<p className="mt-1 text-sm text-violet-300">Login Meta: {a.metaUserName}</p>}<p className="mt-1 text-sm text-slate-400">act_{a.adAccountId} · {a.currency||"Moeda não informada"} · {a.timezoneName||"Fuso não informado"}</p></div><Button variant={a.selected?"outline":"default"} disabled={saving===a.id} onClick={()=>select(a)}>{saving===a.id?<Loader2 className="animate-spin"/>:null}{a.selected?"Desvincular":"Vincular conta"}</Button></div>)}</div>}
 </div>;
}
