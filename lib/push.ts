import { eq } from "drizzle-orm";
import webpush from "web-push";
import { getDb } from "@/db";
import { pushSubscriptions } from "@/db/schema";

export type PushResult = { configured: boolean; subscriptions: number; sent: number; failed: number; errors: string[] };

// `VAPID_SUBJECT` precisa ser "mailto:..." ou "https://...". Um e-mail puro
// fazia setVapidDetails lançar erro e TODO push falhava em silêncio.
function vapidSubject() {
 const raw=(process.env.VAPID_SUBJECT||"").trim().replace(/^["']|["']$/g,"");
 if(/^mailto:\S+@\S+$/i.test(raw)||/^https:\/\/\S+$/i.test(raw))return raw;
 if(/^\S+@\S+\.\S+$/.test(raw))return `mailto:${raw}`;
 return "https://www.ghostscale.com.br";
}

let vapidReady=false;
function vapid(){
 const clean=(v:string|undefined)=>(v||"").trim().replace(/^["']|["']$/g,"");
 const pub=clean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY||process.env.VAPID_PUBLIC_KEY);
 const priv=clean(process.env.VAPID_PRIVATE_KEY);
 if(!pub||!priv)return false;
 if(!vapidReady){webpush.setVapidDetails(vapidSubject(),pub,priv);vapidReady=true;}
 return true;
}

export async function pushToWorkspace(workspaceId:string,payload:{title:string;body:string;url?:string;tag?:string}):Promise<PushResult>{
 const result:PushResult={configured:false,subscriptions:0,sent:0,failed:0,errors:[]};
 // App nativo (som de venda com o app fechado) em paralelo ao push web.
 const native=import("@/lib/native-push").then(m=>m.sendNativePush(workspaceId,payload)).catch(e=>({tokens:0,sent:0,failed:1,errors:[e instanceof Error?e.message:"erro"]}));
 try{
  const subs=vapid()?await getDb().select().from(pushSubscriptions).where(eq(pushSubscriptions.workspaceId,workspaceId)):null;
  if(subs){result.configured=true;result.subscriptions=subs.length;}
  const body=JSON.stringify({url:"/vendas",...payload});
  if(subs?.length)await Promise.allSettled(subs.map(async s=>{
   // urgency "high": sem isso o Android segura a notificação com a tela
   // bloqueada e ela só aparece quando o app é aberto.
   try{await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},body,{urgency:"high",TTL:3600});result.sent++;}
   catch(e){
    result.failed++;
    const code=(e as {statusCode?:number})?.statusCode;
    result.errors.push(code?`HTTP ${code}`:e instanceof Error?e.message.slice(0,120):"erro desconhecido");
    if(code===404||code===410){try{await getDb().delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint,s.endpoint));}catch{}}
    else console.error("push send",code,e instanceof Error?e.message:e);
   }
  }));
 }catch(e){console.error("push",e);result.errors.push(e instanceof Error?e.message.slice(0,160):"erro desconhecido");}
 const n=await native;
 if(n.tokens){result.configured=true;result.subscriptions+=n.tokens;result.sent+=n.sent;result.failed+=n.failed;result.errors.push(...n.errors.map(e=>`app: ${e}`));}
 return result;
}

// Diagnóstico de notificações de venda: cada venda recebida pelos webhooks e
// o resultado do push ficam em audit_logs ("sale.received" / "push.sale"),
// mostrados no sino. Best-effort: nunca derruba o webhook.
export async function recordSaleEvent(workspaceId:string,action:"sale.received"|"push.sale",externalId:string,detail:Record<string,unknown>){
 try{
  const { auditLogs }=await import("@/db/schema");
  await getDb().insert(auditLogs).values({id:crypto.randomUUID(),workspaceId,action,targetType:"order",targetId:externalId.slice(0,120),detail:JSON.stringify(detail).slice(0,1000),createdAt:Math.floor(Date.now()/1000)});
 }catch(e){console.error("sale log",e);}
}

// Envia o push da venda e registra o resultado (inclusive timeout).
export async function notifySale(workspaceId:string,externalId:string,status:string,payload:{title:string;body:string;url?:string;tag?:string}){
 const result=await Promise.race([pushToWorkspace(workspaceId,payload),new Promise<null>(r=>setTimeout(()=>r(null),8000))]).catch(e=>({configured:true,subscriptions:0,sent:0,failed:1,errors:[e instanceof Error?e.message:"erro"]} as PushResult));
 await recordSaleEvent(workspaceId,"push.sale",externalId,result?{status,...result}:{status,timeout:true});
 return result;
}
