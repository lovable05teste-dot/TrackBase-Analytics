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

// - enabled/selected/volume: som. toast: aviso visual (independente do som).
// - projects: filtro futuro por projeto — vazio agora, estrutura pronta no backend.
export type SoundPrefs={selected:SaleSoundId;enabled:boolean;volume:number;toast:boolean;projects?:string[]};
// Conta nova começa sem som (opt-in), mas com toast visual de venda ligado.
export const DEFAULT_SOUND_PREFS:SoundPrefs={selected:"none",enabled:false,volume:0.8,toast:true};

export function parseSoundPrefs(raw:unknown):SoundPrefs{
 let o:Record<string,unknown>={};
 try{o=(typeof raw==="string"?JSON.parse(raw):raw||{}) as Record<string,unknown>;}catch{o={};}
 const volume=typeof o.volume==="number"&&Number.isFinite(o.volume)?Math.min(1,Math.max(0,o.volume)):DEFAULT_SOUND_PREFS.volume;
 const projects=Array.isArray(o.projects)?o.projects.filter((p):p is string=>typeof p==="string"):undefined;
 return{selected:mapLegacySound(o.selected),enabled:o.enabled===true,volume,toast:o.toast===false?false:true,projects};
}
export function sanitizeSoundPrefs(body:unknown):Partial<SoundPrefs>{
 const o=(body||{}) as Record<string,unknown>;const out:Partial<SoundPrefs>={};
 if(typeof o.selected==="string"&&SALE_SOUND_IDS.has(o.selected))out.selected=o.selected as SaleSoundId;
 if(typeof o.enabled==="boolean")out.enabled=o.enabled;
 if(typeof o.volume==="number"&&Number.isFinite(o.volume))out.volume=Math.min(1,Math.max(0,o.volume));
 if(typeof o.toast==="boolean")out.toast=o.toast;
 if(Array.isArray(o.projects))out.projects=o.projects.filter((p):p is string=>typeof p==="string");
 return out;
}
