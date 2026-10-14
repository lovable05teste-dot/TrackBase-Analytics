// Player de som de venda (arquivos em /sounds). Centraliza prefs, unlock de
// autoplay, debounce de rajada e eleição entre abas via BroadcastChannel.
import {DEFAULT_SOUND_PREFS,parseSoundPrefs,soundFile,type SoundPrefs} from "./sound-prefs";

const LS_KEY="trackbase:notification";
const BC_NAME="ghostscale-sale-sound";
const BURST_MS=1500;   // vendas dentro desta janela tocam 1 vez só
const MIN_GAP_MS=1200; // intervalo mínimo entre dois toques
const CLAIM_MS=150;    // janela da eleição entre abas

const tabId=Math.random().toString(36).slice(2)+Date.now().toString(36);

let prefs:SoundPrefs=loadCache();
let blocked=false;
let unlocked=false;
let lastPlayAt=0;
let suppressUntil=0; // push já tocou: a consulta de 5 s não repete
let pendingReplay:{id:string;at:number}|null=null; // som barrado pelo autoplay
let windowStart=0;
let pendingKeys:string[]=[];
let flushTimer:ReturnType<typeof setTimeout>|null=null;
let bc:BroadcastChannel|null=null;
const prefListeners=new Set<(p:SoundPrefs)=>void>();
const blockedListeners=new Set<(b:boolean)=>void>();
const playListeners=new Set<(count:number)=>void>();
const audios=new Map<string,HTMLAudioElement>();

function loadCache():SoundPrefs{
 try{const raw=localStorage.getItem(LS_KEY);if(raw)return parseSoundPrefs(JSON.parse(raw));}catch{}
 return {...DEFAULT_SOUND_PREFS};
}
function persist(){
 try{localStorage.setItem(LS_KEY,JSON.stringify(prefs));}catch{}
 try{window.dispatchEvent(new CustomEvent("tb-sound-change",{detail:{sound:prefs}}));}catch{}
 try{
  if("serviceWorker" in navigator){
   navigator.serviceWorker.ready.then(reg=>{try{reg.active?.postMessage({type:"set-sound",soundId:prefs.selected,enabled:prefs.enabled});}catch{}});
  }
 }catch{}
 for(const fn of prefListeners){try{fn({...prefs});}catch{}}
}
function setBlocked(b:boolean){
 if(blocked===b)return;blocked=b;
 for(const fn of blockedListeners){try{fn(b);}catch{}}
}
function getAudio(id:string):HTMLAudioElement|null{
 try{
  if(typeof window==="undefined")return null;
  let a=audios.get(id);
  if(!a){const f=soundFile(id);if(!f)return null;a=new Audio(f);a.preload="none";audios.set(id,a);}
  return a;
 }catch{return null;}
}
// Pré-carrega o som escolhido sem bloquear a página (chamado em idle).
function prime(){
 try{
  if(prefs.selected==="none")return;
  const a=getAudio(prefs.selected);
  if(a&&a.preload!=="auto"){a.preload="auto";try{a.load();}catch{}}
 }catch{}
}
function schedulePrime(){
 try{
  const w=window as unknown as {requestIdleCallback?:(cb:()=>void)=>void};
  if(w.requestIdleCallback)w.requestIdleCallback(prime);
  else setTimeout(prime,3000);
 }catch{}
}
function ensureUnlock(){
 if(unlocked||typeof window==="undefined")return;unlocked=true;
 setBlocked(false);prime();
}
// O navegador barrou o som (ninguém clicou na página ainda): guarda para
// tocar no primeiro clique, se a venda for recente.
function markBlocked(id:string,err:unknown){
 if(err&&typeof err==="object"&&(err as {name?:string}).name!=="NotAllowedError")return;
 pendingReplay={id,at:Date.now()};setBlocked(true);
}
function onGesture(){
 ensureUnlock();
 if(!blocked&&!pendingReplay)return;
 setBlocked(false);
 const p=pendingReplay;pendingReplay=null;
 if(p&&Date.now()-p.at<5*60000&&prefs.enabled)playNow(p.id);
}
function playNow(id:string){
 const a=getAudio(id);if(!a)return;
 try{a.volume=prefs.volume;a.currentTime=0;const r=a.play();if(r&&typeof r.catch==="function")r.catch(e=>markBlocked(id,e));lastPlayAt=Date.now();}catch(e){markBlocked(id,e);}
}
if(typeof window!=="undefined"){
 window.addEventListener("pointerdown",onGesture,true);
 window.addEventListener("keydown",onGesture,true);
 window.addEventListener("touchend",onGesture,true);
 try{
  bc=new BroadcastChannel(BC_NAME);
  bc.onmessage=(e)=>{
   const m=e.data as {k?:string;tab?:string;key?:string}|null;
   if(!m||typeof m!=="object")return;
   if(m.k==="claim"&&typeof m.tab==="string"&&typeof m.key==="string")onClaim(m.tab,m.key);
   if(m.k==="played"&&typeof m.key==="string")onPlayedElsewhere(m.key);
   if(m.k==="push-played"){suppressUntil=Date.now()+15000;clearFlush();}
  };
 }catch{bc=null;}
 schedulePrime();
}

const claims=new Map<string,Set<string>>(); // windowKey -> tabs que reivindicaram
function onClaim(tab:string,key:string){
 let s=claims.get(key);if(!s){s=new Set();claims.set(key,s);}
 s.add(tab);
 setTimeout(()=>{const cur=claims.get(key);if(cur){cur.delete(tab);if(!cur.size)claims.delete(key);}},CLAIM_MS*4);
}
function onPlayedElsewhere(key:string){
 // Outra aba tocou esta rajada: cancela a nossa.
 if(pendingKeys.length&&windowKey()===key){clearFlush();}
}
function windowKey(){return pendingKeys.slice().sort().join("|");}

function clearFlush(){
 pendingKeys=[];windowStart=0;
 if(flushTimer){clearTimeout(flushTimer);flushTimer=null;}
}
function effectivePlayable(){
 return prefs.enabled&&prefs.selected!=="none"&&!blocked;
}
function doPlay(count:number){
 const a=prefs.selected==="none"?null:getAudio(prefs.selected);
 if(!a)return;
 try{
  a.volume=prefs.volume;a.currentTime=0;
  const r=a.play();
  if(r&&typeof r.catch==="function")r.catch(e=>markBlocked(prefs.selected,e));
  lastPlayAt=Date.now();
  try{bc?.postMessage({k:"played",key:windowKey()});}catch{}
  for(const fn of playListeners){try{fn(count);}catch{}}
 }catch(e){markBlocked(prefs.selected,e);}
}
function flush(){
 flushTimer=null;
 if(!pendingKeys.length){windowStart=0;return;}
 if(!effectivePlayable()){clearFlush();return;}
 const key=windowKey(),count=pendingKeys.length;
 const wait=CLAIM_MS+30;
 setTimeout(()=>{
  const rivals=claims.get(key);
  let mine=true;
  if(bc&&rivals){for(const t of rivals){if(t<tabId){mine=false;break;}}}
  if(!bc&&typeof document!=="undefined"&&!document.hasFocus())mine=false;
  claims.delete(key);
  if(mine)doPlay(count);
  clearFlush();
 },wait);
 try{bc?.postMessage({k:"claim",tab:tabId,key});}catch{}
}
function scheduleFlush(){
 // Respeita o intervalo mínimo entre toques.
 const delay=Math.max(0,lastPlayAt+MIN_GAP_MS-Date.now());
 if(flushTimer)clearTimeout(flushTimer);
 flushTimer=setTimeout(flush,delay);
}

/** API pública **/
export function getSoundPrefs():SoundPrefs{return {...prefs};}
export function subscribeSoundPrefs(fn:(p:SoundPrefs)=>void){
 prefListeners.add(fn);return()=>{prefListeners.delete(fn);};
}
export function isAudioBlocked(){return blocked;}
export function subscribeAudioBlocked(fn:(b:boolean)=>void){
 blockedListeners.add(fn);return()=>{blockedListeners.delete(fn);};
}
export function onSalePlay(fn:(count:number)=>void){
 playListeners.add(fn);return()=>{playListeners.delete(fn);};
}
export async function refreshSoundPrefs(){
 try{
  const r=await fetch("/api/notifications/sound",{cache:"no-store"});
  if(!r.ok)return;const b=await r.json();
  if(b&&b.stored&&b.prefs){prefs=parseSoundPrefs(b.prefs);persist();prime();return;}
  // Sem linha no banco: sobe o cache local (migra opt-in legado) sem sobrescrever nada.
  const raw=localStorage.getItem(LS_KEY);
  if(raw){try{await fetch("/api/notifications/sound",{method:"POST",headers:{"content-type":"application/json"},body:raw});}catch{}}
 }catch{}
}
export function setSoundPrefs(patch:Partial<SoundPrefs>){
 const next:SoundPrefs={
  selected:patch.selected!==undefined?patch.selected:prefs.selected,
  enabled:patch.enabled!==undefined?patch.enabled:prefs.enabled,
  volume:patch.volume!==undefined?Math.min(1,Math.max(0,patch.volume)):prefs.volume,
  toast:patch.toast!==undefined?patch.toast:prefs.toast,
  projects:patch.projects!==undefined?patch.projects:prefs.projects,
 };
 const muted=!next.enabled||next.selected==="none";
 prefs=next;persist();
 if(muted)clearFlush();
 else prime();
 try{fetch("/api/notifications/sound",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(next)}).catch(()=>{});}catch{}
}
/** Toca o som escolhido agora (gesto do usuário: botão Testar). */
export function previewSound(id:string){
 ensureUnlock();
 playNow(id);
}
/**
 * Avisa vendas aprovadas novas. Colapsa rajadas em 1 toque e elege 1 aba.
 * Chamar só com IDs ainda não vistos por esta aba.
 */
export function notifyApprovedSales(saleIds:string[]){
 if(!saleIds.length)return;
 if(!prefs.enabled||prefs.selected==="none")return;
 if(Date.now()<suppressUntil)return;
 const now=Date.now();
 if(!pendingKeys.length||now-windowStart>BURST_MS){clearFlush();windowStart=now;}
 for(const id of saleIds)if(!pendingKeys.includes(id))pendingKeys.push(id);
 scheduleFlush();
}
/** Silencia tudo, inclusive rajada em andamento. */
export function silenceAll(){clearFlush();}
/** Som vindo do service worker (push): toque único, sem eleição. */
// O service worker avisa uma aba só; ela toca na hora (sem timer, que em aba
// de fundo atrasa) e manda as outras abas não repetirem.
export function playFromWorker(){
 if(!prefs.enabled||prefs.selected==="none")return;
 suppressUntil=Date.now()+15000;clearFlush();
 try{bc?.postMessage({k:"push-played"});}catch{}
 playNow(prefs.selected);
}
/** Som ligado mas o navegador ainda não deixou tocar (falta um clique). */
export function needsAudioGesture(){
 if(typeof navigator==="undefined")return false;
 if(blocked)return true;
 const ua=(navigator as Navigator&{userActivation?:{hasBeenActive:boolean}}).userActivation;
 return ua?!ua.hasBeenActive:false;
}
