"use client";
import {useEffect,useState} from "react";
import {ChevronDown,ChevronRight,Loader2,Volume2} from "lucide-react";
import {playSound,sounds} from "@/lib/sounds";
import {Switch} from "@/components/ui/switch";

const STORAGE="trackbase:notification";
type Pref={selected:string;enabled:boolean};

function readPref():Pref{try{const raw=localStorage.getItem(STORAGE);if(raw){const p=JSON.parse(raw);return{selected:p.selected&&sounds.some(s=>s.id===p.selected)?p.selected:"cha-ching",enabled:typeof p.enabled==="boolean"?p.enabled:true}}}catch{}return{selected:"cha-ching",enabled:true}}

function useSoundPref(){
 const[pref,setPref]=useState<Pref>(readPref);
 useEffect(()=>{try{localStorage.setItem(STORAGE,JSON.stringify(pref));}catch{}window.dispatchEvent(new CustomEvent("tb-sound-change",{detail:{sound:pref}}));(async()=>{try{if("serviceWorker" in navigator){const reg=await navigator.serviceWorker.ready;if(reg.active)reg.active.postMessage({type:"set-sound",soundId:pref.selected,enabled:pref.enabled});}}catch{}})();},[pref]);
 const pick=(id:string)=>{setPref(p=>({...p,selected:id}));playSound(id);};
 const toggle=()=>{const next={...pref,enabled:!pref.enabled};setPref(next);if(next.enabled)playSound(pref.selected);};
 return{pref,pick,toggle};
}

function SoundList({pref,onPick}:{pref:Pref;onPick:(id:string)=>void}){
 const[playing,setPlaying]=useState("");
 const pick=(id:string)=>{onPick(id);setPlaying(id);setTimeout(()=>setPlaying(""),1500);};
 return <div className="space-y-1">{sounds.map(s=>{const active=pref.selected===s.id&&pref.enabled;return <button key={s.id} type="button" onClick={()=>pick(s.id)} className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs transition-colors ${active?"border-blue-400/40 bg-blue-50 text-blue-700":"border-transparent text-slate-600 hover:bg-slate-50"}`}><span className="text-sm leading-none">{s.icon}</span><span className="flex-1 truncate">{s.name}</span>{playing===s.id?<Loader2 className="size-3 shrink-0 animate-spin text-blue-500"/>:active?<span className="size-1.5 shrink-0 rounded-full bg-blue-600"/>:null}</button>})}</div>;
}

export function SoundSidebar(){
 const{pref,pick,toggle}=useSoundPref();
 const[open,setOpen]=useState(false);
 return <div className="mt-6 rounded-xl border border-slate-200 p-1.5">
  <div className="flex items-center gap-1">
   <button type="button" onClick={toggle} title={pref.enabled?"Clique para desligar o som de venda":"Clique para ativar o som de venda"} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left">
    <Volume2 className={`size-4 shrink-0 ${pref.enabled?"text-blue-600":"text-slate-400"}`}/>
    <span className="min-w-0 flex-1"><b className="block text-sm">Notificação</b><small className={`block truncate text-xs ${pref.enabled?"text-emerald-600":"text-slate-400"}`}>{pref.enabled?"Som de venda ativo":"Som desligado"}</small></span>
    <span className={`h-2 w-2 shrink-0 rounded-full ${pref.enabled?"bg-emerald-500":"bg-slate-300"}`}/>
   </button>
   <button type="button" onClick={()=>setOpen(v=>!v)} title={open?"Ocultar sons":"Ver os 4 sons"} className="shrink-0 cursor-pointer rounded-lg p-2 text-slate-500 transition hover:text-blue-600">{open?<ChevronDown className="size-4"/>:<ChevronRight className="size-4"/>}</button>
  </div>
  {open&&<div className="mt-1 space-y-2 border-t border-slate-200 p-2">
   <div className="flex items-center justify-between px-0.5 text-xs"><span className="text-slate-500">Som de venda</span><Switch checked={pref.enabled} onCheckedChange={toggle}/></div>
   <div className="max-h-52 space-y-1 overflow-y-auto pr-0.5"><SoundList pref={pref} onPick={pick}/></div>
   <p className="px-0.5 text-[10px] leading-relaxed text-slate-400">Clique em um som para ouvir e ativar.</p>
  </div>}
 </div>;
}

export function SoundMobile(){
 const{pref,pick,toggle}=useSoundPref();
 const[open,setOpen]=useState(false);
 return <div className="border-b border-slate-200 bg-card px-2 py-2 lg:hidden">
  <div className="flex items-center gap-1">
   <button type="button" onClick={toggle} title={pref.enabled?"Clique para desligar o som":"Clique para ativar o som"} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left">
    <Volume2 className={`size-4 shrink-0 ${pref.enabled?"text-blue-600":"text-slate-400"}`}/>
    <span className="min-w-0 flex-1"><b className="block text-sm">Notificação</b><small className={`block truncate text-xs ${pref.enabled?"text-emerald-600":"text-slate-400"}`}>{pref.enabled?"Som de venda ativo":"Som desligado"}</small></span>
    <span className={`h-2 w-2 shrink-0 rounded-full ${pref.enabled?"bg-emerald-500":"bg-slate-300"}`}/>
   </button>
   <button type="button" onClick={()=>setOpen(v=>!v)} title={open?"Ocultar sons":"Ver os 4 sons"} className="shrink-0 cursor-pointer rounded-lg p-2 text-slate-500 transition hover:text-blue-600">{open?<ChevronDown className="size-4"/>:<ChevronRight className="size-4"/>}</button>
  </div>
  {open&&<div className="mt-1 space-y-2 border-t border-slate-200 p-2">
   <div className="flex items-center justify-between px-0.5 text-xs"><span className="text-slate-500">Som de venda</span><Switch checked={pref.enabled} onCheckedChange={toggle}/></div>
   <div className="max-h-64 space-y-1 overflow-y-auto pr-0.5"><SoundList pref={pref} onPick={pick}/></div>
   <p className="px-0.5 text-[10px] leading-relaxed text-slate-400">Clique em um som para ouvir e ativar.</p>
  </div>}
 </div>;
}