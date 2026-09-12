export const SALE_SOUNDS=[
 {id:"venda_cha_ching",name:"Caixa registradora",desc:"Impactante, estilo caixa.",file:"/sounds/venda_cha_ching.wav",icon:"💰"},
 {id:"venda_moeda",name:"Moeda arcade",desc:"Blip curto e discreto.",file:"/sounds/venda_moeda.wav",icon:"🪙"},
 {id:"venda_chime_sucesso",name:"Chime de sucesso",desc:"Acorde quente ascendente.",file:"/sounds/venda_chime_sucesso.wav",icon:"🔔"},
] as const;
export type SaleSoundId=(typeof SALE_SOUNDS)[number]["id"]|"none";
export const SALE_SOUND_IDS:Set<string>=new Set([...SALE_SOUNDS.map(s=>s.id),"none"]);
export function soundFile(id:string):string|null{const s=SALE_SOUNDS.find(x=>x.id===id);return s?s.file:null;}
// IDs legados (síntese WebAudio) -> arquivos. Usado na migração do localStorage.
const LEGACY:Record<string,SaleSoundId>={"caixa-registradora":"venda_cha_ching","cha-ching":"venda_cha_ching","moedas":"venda_moeda","sino-venda":"venda_chime_sucesso","ka-ching":"venda_cha_ching"};
export function mapLegacySound(id:unknown):SaleSoundId{
 if(typeof id!=="string")return "none";
 if(id==="none"||SALE_SOUND_IDS.has(id))return id as SaleSoundId;
 return LEGACY[id]??"none";
}

export type SoundPrefs={selected:SaleSoundId;enabled:boolean;volume:number};
// Conta nova começa muda: som só toca após opt-in explícito em Configurações.
export const DEFAULT_SOUND_PREFS:SoundPrefs={selected:"none",enabled:false,volume:0.8};

export function parseSoundPrefs(raw:unknown):SoundPrefs{
 let o:Record<string,unknown>={};
 try{o=(typeof raw==="string"?JSON.parse(raw):raw||{}) as Record<string,unknown>;}catch{o={};}
 const volume=typeof o.volume==="number"&&Number.isFinite(o.volume)?Math.min(1,Math.max(0,o.volume)):DEFAULT_SOUND_PREFS.volume;
 return{selected:mapLegacySound(o.selected),enabled:o.enabled===true,volume};
}
export function sanitizeSoundPrefs(body:unknown):Partial<SoundPrefs>{
 const o=(body||{}) as Record<string,unknown>;const out:Partial<SoundPrefs>={};
 if(typeof o.selected==="string"&&SALE_SOUND_IDS.has(o.selected))out.selected=o.selected as SaleSoundId;
 if(typeof o.enabled==="boolean")out.enabled=o.enabled;
 if(typeof o.volume==="number"&&Number.isFinite(o.volume))out.volume=Math.min(1,Math.max(0,o.volume));
 return out;
}
