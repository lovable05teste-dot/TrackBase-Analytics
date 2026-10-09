"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {Bell,BellRing,Smartphone} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Switch} from "@/components/ui/switch";
import {DEFAULT_PREFS,type NotifyPrefs} from "@/lib/notify";
import {SALE_SOUNDS,type SoundPrefs} from "@/lib/sound-prefs";
import {getSoundPrefs,playFromWorker,previewSound,setSoundPrefs,subscribeSoundPrefs} from "@/lib/sale-sounds";

type Order={id:string;externalId:string;status:string;value:number;currency:string;provider:string;projectName?:string;utmCampaign?:string|null;updatedAt:number;createdAt:number};
const SEEN_KEY="tb_notif_seen";
const money=(v:number,c="BRL")=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:c}).format(v||0);
function ago(ts:number){const s=Math.max(1,Math.floor(Date.now()/1000)-ts);if(s<60)return `há ${s}s`;const m=Math.floor(s/60);if(m<60)return `há ${m}min`;const h=Math.floor(m/60);if(h<24)return `há ${h}h`;return `há ${Math.floor(h/24)}d`}
function bufToB64(buf:ArrayBuffer|null){if(!buf)return "";const b=new Uint8Array(buf);let s="";for(let i=0;i<b.length;i++)s+=String.fromCharCode(b[i]);return btoa(s)}
function vapidKey(k:string){const pad="=".repeat((4-k.length%4)%4);return Uint8Array.from(atob((k+pad).replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0))}

export function NotificationsBell(){
 const[orders,setOrders]=useState<Order[]>([]);const[open,setOpen]=useState(false);const[seen,setSeen]=useState(0);
 const[prefs,setPrefs]=useState<NotifyPrefs>(DEFAULT_PREFS);
 const[sound,setSound]=useState<SoundPrefs>(getSoundPrefs());
 const[push,setPush]=useState<"unknown"|"unsupported"|"off"|"on"|"denied"|"loading">("unknown");
 const[testing,setTesting]=useState(false);const[testMsg,setTestMsg]=useState("");
 // Dispara um push real de teste: confere se a notificação e o som chegam no celular.
 const sendTest=async()=>{setTesting(true);setTestMsg("");try{const r=await fetch("/api/push/test",{method:"POST",credentials:"same-origin"});const b=await r.json().catch(()=>({})) as {configured?:boolean;subscriptions?:number;sent?:number;failed?:number;errors?:string[]};if(!r.ok)setTestMsg("Não foi possível enviar o teste.");else if(!b.configured)setTestMsg("O servidor está sem as chaves de push (VAPID). Avise o suporte.");else if(!b.subscriptions)setTestMsg("Nenhum celular inscrito. Toque em “Ativar notificação no celular” neste aparelho.");else if(b.sent)setTestMsg(`Enviada para ${b.sent} aparelho(s). Bloqueie a tela: deve tocar em alguns segundos.${b.failed?` ${b.failed} falhou(aram): ${(b.errors||[]).join(", ")}.`:""}`);else setTestMsg(`O serviço de push recusou: ${(b.errors||[]).join(", ")||"erro desconhecido"}. Desative e ative a notificação de novo.`)}catch{setTestMsg("Não foi possível enviar o teste.")}finally{setTesting(false)}};
 const known=useRef<Set<string>>(new Set());
 const prefsRef=useRef(prefs);
 useEffect(()=>{prefsRef.current=prefs;},[prefs]);
 const interesting=(o:Order)=>o.status==="approved"?prefs.approved:o.status==="pending"?prefs.pending:false;
 const unread=orders.filter(o=>interesting(o)&&(o.updatedAt*1000>(seen||0))).length;

 const load=useCallback(async(silentInit:boolean)=>{
  try{
   const r=await fetch("/api/orders?period=last_30d",{cache:"no-store"});if(!r.ok)return;
   const b=await r.json();const p=prefsRef.current;
   const list:Array<Order>=(b.orders||[]).filter((o:Order)=>o.status==="approved"?p.approved:o.status==="pending"?p.pending:false);
   if(silentInit){known.current=new Set(list.map(o=>o.id));setOrders(list);return;}
const fresh=list.filter(o=>!known.current.has(o.id));
    if(fresh.length){
     // Som + toast de venda aprovada são tratados pelo SoundNotifications (global, 5s).
     known.current=new Set(list.map(o=>o.id));
    }
   setOrders(list);
  }catch{}
 },[]);

 const savePrefs=async(next:NotifyPrefs)=>{
  setPrefs(next);
  setOrders(cur=>cur.filter(o=>o.status==="approved"?next.approved:o.status==="pending"?next.pending:false));
  try{await fetch("/api/notifications/prefs",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(next)});}catch{}
 };

 useEffect(()=>{
  try{setSeen(Number(localStorage.getItem(SEEN_KEY)||0));}catch{}
  void load(true);
  fetch("/api/notifications/prefs",{cache:"no-store"}).then(r=>r.json()).then(b=>{if(b.prefs)setPrefs(b.prefs);}).catch(()=>{});
  const timer=setInterval(()=>{if(!document.hidden)void load(false);},30000);
  return ()=>clearInterval(timer);
 },[load]);

 useEffect(()=>{
  let alive=true;
  const detect=async()=>{
   if(!("Notification" in window)||!("serviceWorker" in navigator)||!("PushManager" in window)){if(alive)setPush("unsupported");return;}
   if(Notification.permission==="denied"){if(alive)setPush("denied");return;}
   try{
    const reg=await navigator.serviceWorker.ready;
    const sub=await reg.pushManager.getSubscription();
    if(sub&&Notification.permission==="granted"){
     const body={endpoint:sub.endpoint,keys:{p256dh:bufToB64(sub.getKey("p256dh")),auth:bufToB64(sub.getKey("auth"))}};
     const synced=await fetch("/api/push/subscribe",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
     if(alive)setPush(synced.ok?"on":"off");
    }else if(alive)setPush("off");
   }catch{if(alive)setPush("off");}
  };
  void detect();
  return()=>{alive=false;};
 },[]);

 useEffect(()=>{const off=subscribeSoundPrefs(setSound);return off;},[]);

 const onSwMessage=(e:MessageEvent)=>{const m=e.data;if(m&&m.type==="play-sale-sound"){playFromWorker(m.soundId,m.enabled);}};

 useEffect(()=>{
  try{if("serviceWorker" in navigator)navigator.serviceWorker.addEventListener("message",onSwMessage);}catch{}
  return()=>{try{if("serviceWorker" in navigator)navigator.serviceWorker.removeEventListener("message",onSwMessage);}catch{}};
 },[]);

 const markSeen=()=>{const now=Date.now();setSeen(now);try{localStorage.setItem(SEEN_KEY,String(now));}catch{}};
 const toggle=()=>{if(!open)markSeen();setOpen(v=>!v);};
 // iPhone: a chave VAPID é buscada antes, para o subscribe acontecer logo
 // depois da permissão (o Safari pode recusar se houver espera no meio).
 const vapidRef=useRef("");
 const[pushError,setPushError]=useState("");
 const[iosTab,setIosTab]=useState(false);
 useEffect(()=>{
  const t=window.setTimeout(()=>{
   try{const ua=navigator.userAgent;const ios=/iPhone|iPad|iPod/.test(ua)||(ua.includes("Mac")&&navigator.maxTouchPoints>1);const standalone=window.matchMedia("(display-mode: standalone)").matches||(navigator as unknown as {standalone?:boolean}).standalone===true;setIosTab(ios&&!standalone)}catch{}
   fetch("/api/push/subscribe",{cache:"no-store"}).then(r=>r.json()).then((c:{configured?:boolean;publicKey?:string})=>{if(c.configured&&c.publicKey)vapidRef.current=c.publicKey}).catch(()=>{});
  },0);
  return()=>window.clearTimeout(t);
 },[]);
 const enablePush=async()=>{
  setPush("loading");setPushError("");
  try{
   const perm=await Notification.requestPermission();
   if(perm!=="granted"){setPush("denied");return;}
   let key=vapidRef.current;
   if(!key){const c=await fetch("/api/push/subscribe",{cache:"no-store"}).then(r=>r.json()) as {configured?:boolean;publicKey?:string};key=c.configured&&c.publicKey?c.publicKey:""}
   if(!key){setPush("off");setPushError("O servidor está sem as chaves de push (VAPID).");return;}
   const reg=await navigator.serviceWorker.ready;
   const sub=(await reg.pushManager.getSubscription())||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:vapidKey(key)});
   const r=await fetch("/api/push/subscribe",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({endpoint:sub.endpoint,keys:{p256dh:bufToB64(sub.getKey("p256dh")),auth:bufToB64(sub.getKey("auth"))}})});
   if(!r.ok){setPush("off");setPushError(`Não foi possível salvar a inscrição (${r.status}).`);return;}
   setPush("on");
  }catch(e){setPush("off");setPushError(`Falha ao ativar: ${e instanceof Error?e.message:"erro desconhecido"}`);}
 };
 const recent=orders.slice(0,12);
 return <div className="relative">
  <Button variant="outline" size="icon" onClick={toggle} aria-label="Notificações de vendas" className="relative">
   {unread?<BellRing/>:<Bell/>}
   {unread>0&&<span className="absolute -right-1.5 -top-1.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">{unread>99?"99+":unread}</span>}
  </Button>
  {open&&<>
   <div className="fixed inset-0 z-40" onClick={()=>setOpen(false)}/>
   <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xl">
    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><b className="text-sm">Vendas recentes</b><a href="/vendas" className="text-xs font-medium text-blue-600 hover:underline">Ver vendas</a></div>
    <div className="max-h-80 overflow-y-auto">
     {recent.length===0&&<p className="px-4 py-6 text-center text-sm text-slate-500">Nenhuma venda pendente ou aprovada nos últimos 30 dias.</p>}
     {recent.map(o=><div key={o.id} className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 last:border-0"><span className={`size-2.5 shrink-0 rounded-full ${o.status==="approved"?"bg-emerald-500":"bg-amber-400"}`}/><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{o.status==="approved"?"Venda aprovada":"Venda pendente"} · {money(o.value,o.currency)}</p><p className="truncate text-xs text-slate-500">{o.utmCampaign||o.projectName} · {ago(o.updatedAt)}</p></div></div>)}
    </div>
    <div className="space-y-2 border-t border-slate-200 p-3">
     {iosTab&&push!=="on"&&<div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs leading-5 text-amber-800"><b>No iPhone, a notificação só funciona pelo app da Tela de Início.</b><ol className="mt-1 list-decimal pl-4"><li>Toque em Compartilhar (quadrado com seta) no Safari.</li><li>Escolha “Adicionar à Tela de Início”.</li><li>Abra a GhostScale pelo ícone novo e ative aqui.</li></ol></div>}
     {pushError&&<p role="alert" className="text-center text-xs text-red-600">{pushError}</p>}
     {(push==="off"||push==="unknown")&&<Button variant="outline" size="sm" className="w-full" onClick={enablePush} disabled={push==="unknown"}><Smartphone/>{push==="unknown"?"Verificando notificações…":"Ativar notificação no celular"}</Button>}
     {push==="loading"&&<p className="text-center text-xs text-slate-500">Ativando… confirme no navegador.</p>}
     {push==="denied"&&<p className="text-center text-xs text-slate-500">Notificação bloqueada no navegador — libere nas configurações do site.</p>}
     {push==="unsupported"&&!iosTab&&<p className="text-center text-xs text-slate-500">Este navegador não aceita notificações push. No iPhone, adicione o GhostScale à Tela de Início e abra pelo ícone.</p>}
     {push==="on"&&<><p className="text-center text-xs text-emerald-600">Notificações no celular ativas ✓</p><Button variant="outline" size="sm" className="w-full" disabled={testing} onClick={sendTest}><BellRing/>{testing?"Enviando…":"Enviar venda de teste"}</Button>{testMsg&&<p className="text-center text-xs text-slate-500">{testMsg}</p>}</>}
    </div>
    <div className="space-y-2.5 border-t border-slate-200 p-3">
     <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Avisar sobre</p>
     {[["pending","Vendas pendentes"],["approved","Vendas aprovadas"]].map(([k,label])=>{const key=k as keyof NotifyPrefs;return <label key={k} className="flex cursor-pointer items-center justify-between gap-3 text-sm"><span>{label}</span><Switch checked={prefs[key]} onCheckedChange={v=>savePrefs({...prefs,[key]:v})}/></label>})}
    </div>
    <div className="space-y-2.5 border-t border-slate-200 p-3">
     <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Mostrar na notificação</p>
     {[["showValue","Valor da venda"],["showProduct","Nome do produto"],["showUtm","UTM de campanha"],["showProject","Nome do projeto"],["dailyDigest","Resumo diário às 21h"]].map(([k,label])=>{const key=k as keyof NotifyPrefs;return <label key={k} className="flex cursor-pointer items-center justify-between gap-3 text-sm"><span>{label}</span><Switch checked={prefs[key]} onCheckedChange={v=>savePrefs({...prefs,[key]:v})}/></label>})}
    </div>
    <div className="space-y-2.5 border-t border-slate-200 p-3">
     <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Som da notificação</p>
     <label className="flex cursor-pointer items-center justify-between gap-3 text-sm"><span>Som ligado</span><Switch checked={sound.enabled} onCheckedChange={v=>setSoundPrefs({enabled:v})}/></label>
     {sound.enabled&&sound.selected!=="none"&&<div className="flex items-center gap-2"><select value={sound.selected} onChange={e=>setSoundPrefs({selected:e.target.value as SoundPrefs["selected"]})} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-card px-2 py-1.5 text-sm">{SALE_SOUNDS.map(s=><option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}</select><Button variant="outline" size="sm" onClick={()=>previewSound(sound.selected)}>Testar</Button></div>}
     <a href="/configuracoes#som" className="block text-xs font-medium text-blue-600 hover:underline">Ver todos os sons com demo →</a>
    </div>
   </div>
  </>}</div>;
}
