export const SALE_SOUNDS=[
 {id:"fortpay_caixa_registradora",name:"Caixa registradora",desc:"Som de venda.",file:"/sounds/fortpay_caixa_registradora.wav",icon:"💰"},
 {id:"fortpay_moedas_caindo",name:"Moedas caindo",desc:"Som de venda.",file:"/sounds/fortpay_moedas_caindo.wav",icon:"🪙"},
 {id:"fortpay_registradora",name:"Registradora",desc:"Som de venda.",file:"/sounds/fortpay_registradora.wav",icon:"🔔"},
 {id:"fortpay_caixa_quiet",name:"Caixa",desc:"Som de venda.",file:"/sounds/fortpay_caixa_quiet.wav",icon:"🧾"},
 {id:"fortpay_moeda_meia_coroa",name:"Moeda meia coroa",desc:"Som de venda.",file:"/sounds/fortpay_moeda_meia_coroa.wav",icon:"🪙"},
 {id:"fortpay_moeda",name:"Moeda",desc:"Som de venda.",file:"/sounds/fortpay_moeda.wav",icon:"✨"},
] as const;
export type SaleSoundId=(typeof SALE_SOUNDS)[number]["id"]|"none";
export const SALE_SOUND_IDS:Set<string>=new Set([...SALE_SOUNDS.map(s=>s.id),"none"]);
export function soundFile(id:string):string|null{const s=SALE_SOUNDS.find(x=>x.id===id);return s?s.file:null;}
// IDs legados (síntese WebAudio) -> arquivos. Usado na migração do localStorage.
const LEGACY:Record<string,SaleSoundId>={"caixa-registradora":"fortpay_caixa_registradora","cha-ching":"fortpay_caixa_registradora","moedas":"fortpay_moedas_caindo","sino-venda":"fortpay_registradora","ka-ching":"fortpay_caixa_registradora","venda_cha_ching":"fortpay_caixa_registradora","venda_moeda":"fortpay_moedas_caindo","venda_chime_sucesso":"fortpay_registradora","venda_pulso_digital":"fortpay_caixa_quiet"};
export function mapLegacySound(id:unknown):SaleSoundId{
 if(typeof id!=="string")return "none";
 if(id==="none"||SALE_SOUND_IDS.has(id))return id as SaleSoundId;
 return LEGACY[id]??"none";
}

// - enabled/selected/volume: som. toast: aviso visual (independente do som).
// - projects: filtro futuro por projeto — vazio agora, estrutura pronta no backend.
export type SoundPrefs={selected:SaleSoundId;enabled:boolean;volume:number;toast:boolean;projects?:string[]};
// Conta nova começa sem som (opt-in), mas com toast visual de venda ligado.
export const DEFAULT_SOUND_PREFS:SoundPrefs={selected:"fortpay_caixa_registradora",enabled:false,volume:0.8,toast:true};

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
