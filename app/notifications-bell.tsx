"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {Bell,BellRing,Smartphone} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Switch} from "@/components/ui/switch";
import {DEFAULT_PREFS,type NotifyPrefs} from "@/lib/notify";

type Order={id:string;externalId:string;status:string;value:number;currency:string;provider:string;projectName?:string;utmCampaign?:string|null;updatedAt:number;createdAt:number};
const SEEN_KEY="tb_notif_seen";
const money=(v:number,c="BRL")=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:c}).format(v||0);
function ago(ts:number){const s=Math.max(1,Math.floor(Date.now()/1000)-ts);if(s<60)return `há ${s}s`;const m=Math.floor(s/60);if(m<60)return `há ${m}min`;const h=Math.floor(m/60);if(h<24)return `há ${h}h`;return `há ${Math.floor(h/24)}d`}
function bufToB64(buf:ArrayBuffer|null){if(!buf)return "";const b=new Uint8Array(buf);let s="";for(let i=0;i<b.length;i++)s+=String.fromCharCode(b[i]);return btoa(s)}
function vapidKey(){const k=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY||"";const pad="=".repeat((4-k.length%4)%4);return Uint8Array.from(atob((k+pad).replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0))}

let audioCtx:AudioContext|null=null;
function unlockAudio(){try{if(!audioCtx)audioCtx=new (window.AudioContext||(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext)();if(audioCtx.state==="suspended")void audioCtx.resume();}catch{}}
function chime(high:boolean){
 try{
  unlockAudio();if(!audioCtx)return;
  const t=audioCtx.currentTime;
  [[high?880:660,0],[high?1318:880,.14]].forEach(([f,dt])=>{
   const o=audioCtx!.createOscillator(),g=audioCtx!.createGain();
   o.type="sine";o.frequency.value=f;
   g.gain.setValueAtTime(0.0001,t+dt);g.gain.exponentialRampToValueAtTime(.25,t+dt+.02);g.gain.exponentialRampToValueAtTime(.0001,t+dt+.22);
   o.connect(g);g.connect(audioCtx!.destination);o.start(t+dt);o.stop(t+dt+.25);
  });
 }catch{}
}

export function NotificationsBell(){
 const[orders,setOrders]=useState<Order[]>([]);const[open,setOpen]=useState(false);const[seen,setSeen]=useState(0);
 const[prefs,setPrefs]=useState<NotifyPrefs>(DEFAULT_PREFS);
 const[push,setPush]=useState<"unknown"|"unsupported"|"off"|"on"|"denied"|"loading">("unknown");
 const known=useRef<Set<string>>(new Set());
 const prefsRef=useRef(prefs);prefsRef.current=prefs;
 const interesting=(o:Order)=>o.status==="approved"?prefs.approved:o.status==="pending"?prefs.pending:false;
 const unread=orders.filter(o=>interesting(o)&&(o.updatedAt*1000>(seen||0))).length;

 const load=useCallback(async(silentInit:boolean)=>{
  try{
   const r=await fetch("/api/orders?period=last_30d",{cache:"no-store"});if(!r.ok)return;
   const b=await r.json();const p=prefsRef.current;
   const list:Array<Order>=(b.orders||[]).filter((o:Order)=>o.status==="approved"?p.approved:o.status==="pending"?p.pending:false);
   if(silentInit){known.current=new Set(list.map(o=>o.id));setOrders(list);return;}
   const fresh=list.filter(o=>!known.current.has(o.id));
   if(fresh.length){chime(fresh.some(o=>o.status==="approved"));known.current=new Set(list.map(o=>o.id));}
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
  unlockAudio();
  const unlock=()=>unlockAudio();
  window.addEventListener("pointerdown",unlock,{once:true});
  void load(true);
  fetch("/api/notifications/prefs",{cache:"no-store"}).then(r=>r.json()).then(b=>{if(b.prefs)setPrefs(b.prefs);}).catch(()=>{});
  const timer=setInterval(()=>{if(!document.hidden)void load(false);},30000);
  (async()=>{
   try{
    if(!("serviceWorker" in navigator)||!("PushManager" in window)||!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY){setPush("unsupported");return;}
    const reg=await navigator.serviceWorker.ready;const sub=await reg.pushManager.getSubscription();
    setPush(sub?"on":"off");
   }catch{setPush("unsupported");}
  })();
  return ()=>{window.removeEventListener("pointerdown",unlock);clearInterval(timer);};
 },[load]);

 const markSeen=()=>{const now=Date.now();setSeen(now);try{localStorage.setItem(SEEN_KEY,String(now));}catch{}};
 const toggle=()=>{if(!open)markSeen();setOpen(v=>!v);};
 const enablePush=async()=>{
  setPush("loading");
  try{
   const perm=await Notification.requestPermission();
   if(perm!=="granted"){setPush("denied");return;}
   const reg=await navigator.serviceWorker.ready;
   const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:vapidKey()});
   const r=await fetch("/api/push/subscribe",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({endpoint:sub.endpoint,keys:{p256dh:bufToB64(sub.getKey("p256dh")),auth:bufToB64(sub.getKey("auth"))}})});
   setPush(r.ok?"on":"off");
  }catch{setPush("off");}
 };
 const recent=orders.slice(0,12);
 return <div className="relative">
  <Button variant="outline" size="icon" onClick={toggle} aria-label="Notificações de vendas" className="relative">
   {unread?<BellRing/>:<Bell/>}
   {unread>0&&<span className="absolute -right-1.5 -top-1.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">{unread>99?"99+":unread}</span>}
  </Button>
  {open&&<>
   <div className="fixed inset-0 z-40" onClick={()=>setOpen(false)}/>
   <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xl">
    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><b className="text-sm">Vendas recentes</b><a href="/vendas" className="text-xs font-medium text-blue-600 hover:underline">Ver vendas</a></div>
    <div className="max-h-80 overflow-y-auto">
     {recent.length===0&&<p className="px-4 py-6 text-center text-sm text-slate-500">Nenhuma venda pendente ou aprovada nos últimos 30 dias.</p>}
     {recent.map(o=><div key={o.id} className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 last:border-0"><span className={`size-2.5 shrink-0 rounded-full ${o.status==="approved"?"bg-emerald-500":"bg-amber-400"}`}/><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{o.status==="approved"?"Venda aprovada":"Venda pendente"} · {money(o.value,o.currency)}</p><p className="truncate text-xs text-slate-500">{o.utmCampaign||o.projectName} · {ago(o.updatedAt)}</p></div></div>)}
    </div>
    <div className="space-y-2 border-t border-slate-200 p-3">
     {push==="off"&&<Button variant="outline" size="sm" className="w-full" onClick={enablePush}><Smartphone/>Ativar notificação no celular</Button>}
     {push==="loading"&&<p className="text-center text-xs text-slate-500">Ativando… confirme no navegador.</p>}
     {push==="denied"&&<p className="text-center text-xs text-slate-500">Notificação bloqueada no navegador — libere nas configurações do site.</p>}
     {push==="on"&&<p className="text-center text-xs text-emerald-600">Notificações no celular ativas ✓</p>}
    </div>
    <div className="space-y-2.5 border-t border-slate-200 p-3">
     <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Avisar sobre</p>
     {[["pending","Vendas pendentes"],["approved","Vendas aprovadas"]].map(([k,label])=>{const key=k as keyof NotifyPrefs;return <label key={k} className="flex cursor-pointer items-center justify-between gap-3 text-sm"><span>{label}</span><Switch checked={prefs[key]} onCheckedChange={v=>savePrefs({...prefs,[key]:v})}/></label>})}
    </div>
    <div className="space-y-2.5 border-t border-slate-200 p-3">
     <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Mostrar na notificação</p>
     {[["showValue","Valor da venda"],["showProduct","Nome do produto"],["showUtm","UTM de campanha"],["showProject","Nome do projeto"]].map(([k,label])=>{const key=k as keyof NotifyPrefs;return <label key={k} className="flex cursor-pointer items-center justify-between gap-3 text-sm"><span>{label}</span><Switch checked={prefs[key]} onCheckedChange={v=>savePrefs({...prefs,[key]:v})}/></label>})}
    </div>
   </div>
  </>}</div>;
}
