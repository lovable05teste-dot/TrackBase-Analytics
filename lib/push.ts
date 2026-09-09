import { eq } from "drizzle-orm";
import webpush from "web-push";
import { getDb } from "@/db";
import { pushSubscriptions } from "@/db/schema";

let vapidReady=false;
function vapid(){
 const pub=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY||process.env.VAPID_PUBLIC_KEY||"";
 const priv=process.env.VAPID_PRIVATE_KEY||"";
 if(!pub||!priv)return null;
 const sub=process.env.VAPID_SUBJECT||"https://track-base-analytics.vercel.app/";
 if(!vapidReady){webpush.setVapidDetails(sub,pub,priv);vapidReady=true;}
 return true;
}

export async function pushToWorkspace(workspaceId:string,payload:{title:string;body:string;url?:string;tag?:string}){
 try{
  if(!vapid())return;
  const subs=await getDb().select().from(pushSubscriptions).where(eq(pushSubscriptions.workspaceId,workspaceId));
  if(!subs.length)return;
  const body=JSON.stringify({url:"/vendas",...payload});
  await Promise.allSettled(subs.map(async s=>{
   try{await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},body);}
   catch(e){const code=(e as {statusCode?:number})?.statusCode;if(code===404||code===410){try{await getDb().delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint,s.endpoint));}catch{}}}
  }));
 }catch(e){console.error("push",e);}
}
