// Shim de compatibilidade: o catálogo antigo de síntese WebAudio (`sounds`,
// `playSound`, `DEFAULT_SOUND_ID`) redireciona para o novo player baseado em
// arquivos WAV em /sounds. Usado por código legado que ainda importa
// `lib/sounds` (ex.: relatórios, componentes antigos). Novo código deve
// importar de `lib/sound-prefs` + `lib/sale-sounds`.

import {SALE_SOUNDS,mapLegacySound,type SaleSoundId} from "./sound-prefs";
import {getSoundPrefs,previewSound,refreshSoundPrefs,setSoundPrefs,subscribeSoundPrefs} from "./sale-sounds";
import type {SoundPrefs} from "./sound-prefs";

// IDs do catálogo antigo -> novos arquivos WAV
const LEGACY_IDS=["caixa-registradora","cha-ching","moedas","sino-venda","ka-ching"] as const;

export type SoundFn=(ctx:AudioContext)=>void;

export const sounds=[
 {id:"caixa-registradora",name:"Caixa registradora",icon:"💰",fn:()=>{}},
 {id:"cha-ching",name:"Cha-ching alto",icon:"🔔",fn:()=>{}},
 {id:"moedas",name:"Moedas caindo",icon:"🪙",fn:()=>{}},
 {id:"sino-venda",name:"Sino de venda",icon:"✅",fn:()=>{}},
 {id:"ka-ching",name:"Sino padrão",icon:"🔔",fn:()=>{}},
]as const;

export const DEFAULT_SOUND_ID="caixa-registradora";

export function playSound(id:string){
 if(typeof window==="undefined")return;
 const mapped=mapLegacySound(id);
 if(mapped==="none")return;
 previewSound(mapped);
}

// Migra prefs antigas (localStorage) para o novo formato ao primeiro uso.
let migrated=false;
export function getSoundPrefsShim():SoundPrefs{
 if(!migrated){migrated=true;refreshSoundPrefs();}
 return getSoundPrefs();
}

export function onSoundChange(fn:(p:SoundPrefs)=>void){
 return subscribeSoundPrefs(fn);
}

export function setSoundPrefsShim(patch:Partial<SoundPrefs>){
 setSoundPrefs(patch);
}

// Compat: componentes legados podem chamar `playSound("id")` direto.
export function getAudioContext():AudioContext|null{return null;}