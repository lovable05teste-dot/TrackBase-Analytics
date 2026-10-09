"use client";
import {FormEvent,useEffect,useState} from "react";
import {Check,CheckCircle2,Copy,KeyRound,Loader2,Plus,Settings2,ShieldCheck,Trash2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {TrackingRules} from "./tracking-rules";
import { copyText } from "@/lib/clipboard";
import { apiFetch } from "@/lib/plan-client";

type Project={id:string;name:string;domain?:string;pixelId?:string;metaConnectedAt?:string};
type Credential={id:string;name:string;provider:string;projectId:string;active:boolean;createdAt:string;lastUsedAt?:string};
type Created={token:string;webhookUrl:string;webhookUrlWithToken:string;authorization:string};
const input="min-h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-base outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-400/15 sm:text-sm";

function CopyField({label,value,secret=false}:{label:string;value:string;secret?:boolean}){const[c,setC]=useState(false);const copy=async()=>{if(await copyText(value)){setC(true);setTimeout(()=>setC(false),1600)}};return <div className="min-w-0"><div className="mb-2 flex flex-col gap-1 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between"><span className="font-medium">{label}</span>{secret&&<span className="font-medium text-amber-700">Copie agora: não será exibido novamente</span>}</div><div className="grid min-w-0 grid-cols-[minmax(0,1fr)_44px] gap-2"><code className="max-h-28 min-w-0 overflow-y-auto break-all rounded-lg bg-white p-3 text-xs leading-5 text-blue-600">{value}</code><Button aria-label={`Copiar ${label}`} type="button" variant="outline" size="icon" className="size-11" onClick={copy}>{c?<Check/>:<Copy/>}</Button></div></div>}

function ProjectSelect({projects,value,onChange}:{projects:Project[];value:string;onChange:(id:string)=>void}){
 if(projects.length<2)return null;
 return <label className="block max-w-md text-sm font-medium text-slate-700">Projeto<select className={input+" mt-1.5"} value={value} onChange={e=>onChange(e.target.value)}>{projects.map(p=><option className="bg-white" key={p.id} value={p.id}>{p.name}</option>)}</select></label>;
}
const NeedProject=()=> <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-800"><b>Falta o projeto.</b> Conclua a etapa 1 (<a href="#script" className="underline">Instalar o script</a>) e volte aqui.</p>;

type Quality={total:number;email:number;phone:number;fbc:number;fbp:number;score:number;label:string;tips:string[]};
// Indicador de qualidade da CAPI: % das compras (7 dias) com cada dado que a
// Meta usa para casar a venda com o anúncio.
function CapiQualityCard({projectId}:{projectId:string}){
 const[q,setQ]=useState<Quality|null>(null);
 useEffect(()=>{let alive=true;fetch(`/api/meta/pixel/quality?projectId=${encodeURIComponent(projectId)}`,{cache:"no-store"}).then(r=>r.json()).then(b=>{if(alive)setQ(b.quality||null)}).catch(()=>{});return()=>{alive=false}},[projectId]);
 if(!q)return null;
 const pct=(n:number)=>q.total?Math.round(n/q.total*100):0;
 const tone=q.score>=8?"text-emerald-600":q.score>=6?"text-blue-600":q.score>=4?"text-amber-600":"text-red-600";
 return <div className="rounded-xl border border-slate-200 p-4">
  <div className="flex flex-wrap items-baseline justify-between gap-2"><b className="text-sm">Qualidade dos dados enviados à Meta</b><span className={`text-sm font-semibold ${tone}`}>{q.total?`${q.score.toLocaleString("pt-BR")}/10 · ${q.label}`:"Sem compras nos últimos 7 dias"}</span></div>
  {q.total>0&&<><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{([["E-mail",q.email],["Telefone",q.phone],["fbc (clique)",q.fbc],["fbp (navegador)",q.fbp]] as const).map(([label,n])=><div key={label}><p className="text-xs text-slate-500">{label}</p><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${pct(n)>=70?"bg-emerald-500":pct(n)>=40?"bg-amber-500":"bg-red-500"}`} style={{width:`${pct(n)}%`}}/></div><p className="mt-1 text-xs font-semibold tabular-nums">{pct(n)}%</p></div>)}</div>
  <p className="mt-2 text-xs text-slate-500">{q.total} compra(s) nos últimos 7 dias.</p>
  {q.tips.length>0&&<ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-600">{q.tips.map(t=><li key={t}>{t}</li>)}</ul>}</>}
 </div>;
}

export function PixelConnect(){const[projects,setProjects]=useState<Project[]>([]),[projectId,setProjectId]=useState(""),[pixelId,setPixelId]=useState(""),[token,setToken]=useState(""),[testCode,setTestCode]=useState(""),[pixelName,setPixelName]=useState("Pixel GhostScale"),[busy,setBusy]=useState(false),[creating,setCreating]=useState(false),[deleting,setDeleting]=useState(false),[mode,setMode]=useState<"create"|"existing">("existing"),[message,setMessage]=useState(""),[loaded,setLoaded]=useState(false);
 const loadProjects=async()=>{try{const b=await fetch("/api/projects",{cache:"no-store"}).then(r=>r.json());setProjects(b.projects||[]);setProjectId(id=>id||b.projects?.[0]?.id||"")}catch{/* mantém lista atual */}finally{setLoaded(true)}};
 useEffect(()=>{const timer=window.setTimeout(()=>{void loadProjects()},0);return()=>window.clearTimeout(timer)},[]);
 const current=projects.find(p=>p.id===projectId);
 const submit=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setMessage("");try{const r=await apiFetch("/api/meta/connect",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({projectId,pixelId,accessToken:token,testCode})}),b=await r.json();if(!r.ok)throw new Error(b.error||"Não foi possível conectar.");setMessage(`Pixel ${b.pixelId} conectado. Navegador e CAPI estão ativos.`);setToken("");await loadProjects()}catch(e){setMessage(e instanceof Error?e.message:"Erro ao conectar.")}finally{setBusy(false)}};
 const createPixel=async()=>{setCreating(true);setMessage("");try{const r=await apiFetch("/api/meta/pixel/create",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({projectId,name:pixelName})}),b=await r.json();if(!r.ok)throw new Error(b.error||"Não foi possível criar o Pixel.");setPixelId(b.pixelId);setMessage(`Pixel ${b.pixelId} criado e conectado. Navegador e CAPI estão prontos.`);await loadProjects()}catch(e){setMessage(e instanceof Error?e.message:"Erro ao criar Pixel.")}finally{setCreating(false)}};
 const disconnect=async()=>{if(!current?.pixelId||!confirm(`Desconectar o Pixel ${current.pixelId} do projeto “${current.name}”?`))return;setDeleting(true);setMessage("");try{const r=await apiFetch(`/api/meta/connect?projectId=${encodeURIComponent(projectId)}`,{method:"DELETE"}),b=await r.json();if(!r.ok)throw new Error(b.error||"Não foi possível desconectar.");setPixelId("");setMessage("Pixel desconectado do projeto.");await loadProjects()}catch(e){setMessage(e instanceof Error?e.message:"Não foi possível desconectar.")}finally{setDeleting(false)}};
 if(!loaded)return <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="size-4 animate-spin"/>Carregando…</div>;
 if(!projects.length)return <NeedProject/>;
 const ok=/conectado|criado|ativo/i.test(message)&&!/desconectado/i.test(message);
 return <div className="space-y-5">
  <ProjectSelect projects={projects} value={projectId} onChange={id=>{setProjectId(id);setMessage("")}}/>
  {current?.pixelId?<>
   <div className="flex flex-col gap-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="flex items-center gap-2 font-semibold text-emerald-600"><CheckCircle2 className="size-5"/>Pixel conectado</p><p className="mt-1 break-all text-sm text-slate-600">Pixel {current.pixelId} · navegador + API de Conversões</p></div><Button type="button" variant="outline" className="h-11 w-full text-red-600 sm:w-auto" disabled={deleting} onClick={disconnect}>{deleting?<Loader2 className="animate-spin"/>:<Trash2/>}Desconectar</Button></div>
   <CapiQualityCard projectId={current.id}/></>
  :<>
   <div role="tablist" aria-label="Como conectar o Pixel" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-sm font-medium">
    {([["existing","Já tenho um Pixel"],["create","Criar um Pixel novo"]] as const).map(([value,label])=><button key={value} type="button" role="tab" aria-selected={mode===value} onClick={()=>setMode(value)} className={`min-h-11 rounded-lg px-3 transition ${mode===value?"bg-white text-slate-900 shadow-sm":"text-slate-500 hover:text-slate-700"}`}>{label}</button>)}
   </div>
   {mode==="existing"?
    <form onSubmit={submit} className="space-y-3">
     <p className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600"><b className="text-foreground">Onde encontrar:</b> Gerenciador de Eventos da Meta → escolha o Pixel → Configurações → API de Conversões → <b>Gerar token de acesso</b>.</p>
     <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm font-medium text-slate-700">ID do Pixel<input className={input+" mt-1.5"} value={pixelId} onChange={e=>setPixelId(e.target.value.replace(/\D/g,""))} inputMode="numeric" placeholder="123456789012345" required/></label>
      <label className="block text-sm font-medium text-slate-700">Token da API de Conversões<input type="password" className={input+" mt-1.5"} value={token} onChange={e=>setToken(e.target.value)} placeholder="Cole o token da Meta" autoComplete="off" required/></label>
     </div>
     <details className="text-sm"><summary className="cursor-pointer text-slate-500">Código de teste (opcional)</summary><input className={input+" mt-2 max-w-xs"} value={testCode} onChange={e=>setTestCode(e.target.value)} placeholder="TEST12345"/><p className="mt-1 text-xs text-slate-500">Use só para ver eventos na aba &quot;Testar eventos&quot; da Meta. Apague depois.</p></details>
     <Button className="h-11 w-full sm:w-auto" disabled={busy||!projectId}>{busy?<Loader2 className="animate-spin"/>:<ShieldCheck/>}{busy?"Conectando…":"Conectar Pixel"}</Button>
    </form>
   :<div className="space-y-3">
     <p className="text-sm leading-6 text-slate-600">A GhostScale cria o Pixel no portfólio da conta Meta conectada na etapa 2. A conta precisa ser administradora do portfólio.</p>
     <label className="block max-w-md text-sm font-medium text-slate-700">Nome do novo Pixel<input className={input+" mt-1.5"} value={pixelName} onChange={e=>setPixelName(e.target.value)} placeholder="Ex.: Pixel Loja Principal"/></label>
     <Button type="button" className="h-11 w-full sm:w-auto" disabled={creating||!projectId||!pixelName.trim()} onClick={createPixel}>{creating?<Loader2 className="animate-spin"/>:<Plus/>}{creating?"Criando na Meta…":"Criar e conectar"}</Button>
    </div>}
  </>}
  {message&&<p role="status" className={"rounded-xl border p-4 text-sm leading-6 "+(ok?"border-emerald-300 bg-emerald-50 text-emerald-800":"border-red-300 bg-red-50 text-red-800")}>{message}</p>}
  {current?.pixelId&&<details className="rounded-xl border border-slate-200"><summary className="flex min-h-11 cursor-pointer items-center gap-2 px-4 text-sm font-medium text-slate-600"><Settings2 className="size-4"/>Configurações avançadas do rastreamento</summary><div className="border-t border-slate-200 px-4 pb-4"><TrackingRules projectId={projectId} enabled/></div></details>}
 </div>;
}

// Gateways com instruções próprias. `endpoint` = rota que recebe o webhook.
const GATEWAYS=[
 {id:"fortpay",label:"FortPay",logo:"/integration-fortpay.png",where:"No painel da FortPay, abra a área de Webhooks (às vezes chamada de Notificações ou Postback), crie um novo webhook e cole a URL abaixo. Marque todos os eventos de pagamento.",endpoint:"gateway"},
 {id:"sigilopay",label:"Sigilo Pay",logo:"/integration-sigilo-pay.png",where:"No painel da Sigilo Pay, abra a área de Webhooks (às vezes chamada de Notificações ou Postback), crie um novo webhook e cole a URL abaixo.",endpoint:"gateway"},
 {id:"utmify",label:"Utmify",logo:"",where:"Na Utmify, abra a área de Webhooks, crie um novo webhook e cole a URL abaixo como destino.",endpoint:"utmify"},
 {id:"flevopay",label:"FlevoPay",logo:"",where:"No painel da FlevoPay, abra a área de Webhooks (às vezes chamada de Notificações ou Postback), crie um novo webhook e cole a URL abaixo.",endpoint:"gateway"},
 {id:"hotmart",label:"Hotmart",logo:"",where:"Na Hotmart, abra a área de Webhook (notificações), cadastre um novo e cole a URL abaixo. Selecione os eventos de compra.",endpoint:"gateway"},
 {id:"kiwify",label:"Kiwify",logo:"",where:"Na Kiwify, abra a área de Webhooks, crie um novo e cole a URL abaixo. Marque compra aprovada, recusada, reembolso e chargeback.",endpoint:"gateway"},
 {id:"generic",label:"Outro",logo:"/integration-webhook.png",where:"Na sua plataforma, procure por Webhook / Notificações / Postback e cole a URL. Envie id, status, valor e as UTMs.",endpoint:"gateway"},
] as const;
const providerLabel=(id:string)=>GATEWAYS.find(g=>g.id===id)?.label||id;

export function GatewayConnect(){const[projects,setProjects]=useState<Project[]>([]),[credentials,setCredentials]=useState<Credential[]>([]),[projectId,setProjectId]=useState(""),[provider,setProvider]=useState<string>("fortpay"),[busy,setBusy]=useState(false),[error,setError]=useState(""),[loaded,setLoaded]=useState(false),[created,setCreated]=useState<(Created&{provider:string})|null>(null);
 const load=async()=>{try{const[p,c]=await Promise.all([fetch("/api/projects",{cache:"no-store"}).then(r=>r.json()),fetch("/api/credentials",{cache:"no-store"}).then(r=>r.json())]);setProjects(p.projects||[]);setCredentials(c.credentials||[]);setProjectId(id=>id||p.projects?.[0]?.id||"")}catch{/* mantém listas atuais */}finally{setLoaded(true)}};
 useEffect(()=>{const timer=window.setTimeout(()=>{void load()},0);return()=>window.clearTimeout(timer)},[]);
 const gateway=GATEWAYS.find(g=>g.id===provider)||GATEWAYS[0];
 const submit=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setError("");setCreated(null);try{const project=projects.find(p=>p.id===projectId);const name=`${gateway.label}${project&&projects.length>1?` · ${project.name}`:""}`;const r=await apiFetch("/api/credentials",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({projectId,name,provider})}),b=await r.json();if(!r.ok)throw new Error(b.error||"Erro ao gerar a URL.");setCreated({...b.credential,provider});await load()}catch(e){setError(e instanceof Error?e.message:"Erro ao gerar a URL.")}finally{setBusy(false)}};
 const remove=async(c:Credential)=>{if(!confirm(`Desconectar “${c.name}”? O gateway deixará de enviar vendas por esta URL.`))return;setBusy(true);setError("");try{const r=await apiFetch(`/api/credentials?id=${encodeURIComponent(c.id)}`,{method:"DELETE"}),b=await r.json();if(!r.ok)throw new Error(b.error||"Não foi possível desconectar.");await load()}catch(e){setError(e instanceof Error?e.message:"Não foi possível desconectar.")}finally{setBusy(false)}};
 if(!loaded)return <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="size-4 animate-spin"/>Carregando…</div>;
 if(!projects.length)return <NeedProject/>;
 const createdGateway=created&&GATEWAYS.find(g=>g.id===created.provider);
 const origin=typeof location!=="undefined"?location.origin:"";
 return <div className="min-w-0 space-y-5">
  {credentials.length>0&&<section><h4 className="mb-2 text-sm font-semibold text-foreground">Gateways conectados</h4><div className="space-y-2">{credentials.map(c=><div className="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200 p-3 text-sm sm:flex-row sm:items-center sm:justify-between" key={c.id}><div className="min-w-0 break-words"><b>{c.name}</b>{c.name!==providerLabel(c.provider)&&<span className="text-slate-500"> · {providerLabel(c.provider)}</span>}<p className={`mt-1 text-xs ${c.lastUsedAt?"text-emerald-700":"text-slate-500"}`}>{c.lastUsedAt?`● Última venda recebida: ${new Date(c.lastUsedAt).toLocaleString("pt-BR")}`:"○ Aguardando a primeira venda"}</p></div><Button type="button" variant="ghost" size="sm" className="w-full text-red-600 sm:w-auto" disabled={busy} onClick={()=>remove(c)}><Trash2/>Desconectar</Button></div>)}</div></section>}
  <form onSubmit={submit} className="space-y-4">
   <h4 className="text-sm font-semibold text-foreground">{credentials.length?"Conectar outro gateway":"Qual gateway você usa?"}</h4>
   <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
    {GATEWAYS.map(g=><button key={g.id} type="button" aria-pressed={provider===g.id} onClick={()=>{setProvider(g.id);setCreated(null)}} className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition ${provider===g.id?"border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500/15":"border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}>{g.logo?<img src={g.logo} alt="" className="size-6 rounded object-contain"/>:null}{g.label}</button>)}
   </div>
   <ProjectSelect projects={projects} value={projectId} onChange={setProjectId}/>
   <Button className="h-11 w-full sm:w-auto" disabled={busy||!projectId}>{busy?<Loader2 className="animate-spin"/>:<KeyRound/>}Gerar URL de webhook para {gateway.label}</Button>
  </form>
  {created&&createdGateway&&<div className="min-w-0 space-y-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4">
   <p className="flex items-center gap-2 font-semibold text-emerald-600"><CheckCircle2 className="size-5"/>URL gerada. Falta só colar no {createdGateway.label}.</p>
   <p className="text-sm leading-6 text-slate-700">{createdGateway.where}</p>
   <CopyField label="URL do webhook" value={createdGateway.endpoint==="utmify"?`${origin}/api/webhooks/utmify?token=${encodeURIComponent(created.token)}`:created.webhookUrlWithToken} secret/>
   {createdGateway.endpoint==="gateway"&&<details className="text-sm"><summary className="cursor-pointer text-slate-600">Meu gateway pede URL e token separados</summary><div className="mt-3 space-y-3"><CopyField label="URL" value={created.webhookUrl}/><CopyField label="Token (header Authorization: Bearer)" value={created.token} secret/></div></details>}
   <p className="text-xs leading-5 text-slate-600">Depois de colar, faça uma venda de teste: ela aparece em <a href="/vendas" className="font-medium text-blue-600 underline">Vendas</a> e o status desta etapa muda para Concluído.</p>
  </div>}
  {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  <p className="text-xs leading-5 text-slate-500">Vendas aprovadas viram <b>Purchase</b> na Meta automaticamente. Pendentes, reembolsos e chargebacks também entram no painel. <a href="/webhooks" className="font-medium text-blue-600 underline">Testar webhook</a> · <a href="/docs" className="font-medium text-blue-600 underline">Guia técnico</a></p>
 </div>;
}
