export type NotifyPrefs={pending:boolean;approved:boolean;showValue:boolean;showProduct:boolean;showUtm:boolean;showProject:boolean;dailyDigest:boolean};
export const DEFAULT_PREFS:NotifyPrefs={pending:true,approved:true,showValue:true,showProduct:true,showUtm:true,showProject:true,dailyDigest:false};
const KEYS:(keyof NotifyPrefs)[]=["pending","approved","showValue","showProduct","showUtm","showProject","dailyDigest"];
export function parsePrefs(raw:unknown):NotifyPrefs{
 let o:Record<string,unknown>={};
 try{o=(typeof raw==="string"?JSON.parse(raw):raw||{}) as Record<string,unknown>;}catch{o={};}
 const out={...DEFAULT_PREFS};
 for(const k of KEYS)if(typeof o[k]==="boolean")out[k]=o[k] as boolean;
 return out;
}
export function sanitizePrefs(body:unknown):Partial<NotifyPrefs>{
 const o=(body||{}) as Record<string,unknown>;const out:Partial<NotifyPrefs>={};
 for(const k of KEYS)if(typeof o[k]==="boolean")out[k]=o[k] as boolean;
 return out;
}
