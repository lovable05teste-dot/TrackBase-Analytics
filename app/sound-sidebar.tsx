"use client";
import {useEffect,useState} from "react";
import {ChevronDown,ChevronRight,Loader2,Volume2} from "lucide-react";
import {playSound,sounds} from "@/lib/sounds";

const STORAGE="trackbase:notification";

export function SoundSidebar(){
 const [open,setOpen]=useState(false);
 const [sound,setSound]=useState({selected:"ka-ching",enabled:true});
 const [playing,setPlaying]=useState("");

 useEffect(()=>{
  try{const raw=localStorage.getItem(STORAGE);if(raw){const p=JSON.parse(raw);setSound(s=>({selected:p.selected&&sounds.some(x=>x.id===p.selected)?p.selected:"ka-ching",enabled:typeof p.enabled==="boolean"?p.enabled:true}));}}catch{}
 },[]);

 useEffect(()=>{
  try{localStorage.setItem(STORAGE,JSON.stringify(sound));}catch{}
  window.dispatchEvent(new CustomEvent("tb-sound-change",{detail:{sound}}));
  (async()=>{try{if("serviceWorker" in navigator){const reg=await navigator.serviceWorker.ready;if(reg.active)reg.active.postMessage({type:"set-sound",soundId:sound.selected,enabled:sound.enabled});}}catch{}})();
 },[sound]);

 const pick=(id:string)=>{setSound(s=>({...s,selected:id}));setPlaying(id);playSound(id);setTimeout(()=>setPlaying(""),1500);};

 return <div className="mt-6">
  <button type="button" onClick={()=>setOpen(v=>!v)} className={`nav-item w-full justify-between ${open?"nav-active":""}`} aria-expanded={open}><Volume2 className="size-4"/><span>Notificação</span>{open?<ChevronDown className="size-3.5 opacity-60"/>:<ChevronRight className="size-3.5 opacity-60"/>}</button>
  {open&&<div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-card p-2.5">
   <label className="flex cursor-pointer items-center justify-between gap-2 px-0.5 text-xs"><span className="text-slate-600">Som de venda</span><input type="checkbox" checked={sound.enabled} onChange={e=>setSound(s=>({...s,enabled:e.target.checked}))} className="h-3.5 w-3.5 accent-blue-600"/></label>
   <div className="max-h-52 space-y-1 overflow-y-auto pr-0.5">
    {sounds.map(s=>{const active=sound.selected===s.id&&sound.enabled;return <button key={s.id} type="button" onClick={()=>pick(s.id)} className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs transition-colors ${active?"border-blue-400/40 bg-blue-50 text-blue-700":"border-transparent text-slate-600 hover:bg-slate-50"}`}><span className="text-sm leading-none">{s.icon}</span><span className="flex-1 truncate">{s.name}</span>{playing===s.id?<Loader2 className="size-3 shrink-0 animate-spin text-blue-500"/>:active?<span className="size-1.5 shrink-0 rounded-full bg-blue-600"/>:null}</button>})}
   </div>
   <p className="px-0.5 text-[10px] leading-relaxed text-slate-400">Clique em um som para ouvir e ativar.</p>
  </div>}
 </div>;
}