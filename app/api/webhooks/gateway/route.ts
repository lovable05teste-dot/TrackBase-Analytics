import { eq } from "drizzle-orm";
import { ensureDb, getDb } from "../../../../db";
import { apiCredentials, events, orders } from "../../../../db/schema";
import { sha256 } from "../../../../lib/trackbase-security";

function pick(source: Record<string, unknown>, paths: string[]) {
  for (const path of paths) {
    let value: unknown = source;
    for (const key of path.split(".")) value = value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;
    if (value !== undefined && value !== null && value !== "") return value;
  }
}
function statusOf(value: unknown) {
  const s=String(value||"pending").toLowerCase();
  if (/approved|paid|completed|succeeded|success|aprovad|pago/.test(s)) return "approved";
  if (/refund|reembols/.test(s)) return "refunded";
  if (/chargeback|contestad/.test(s)) return "chargeback";
  if (/cancel|failed|recusad|expired/.test(s)) return "cancelled";
  return "pending";
}
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,x-trackbase-key,content-type","Access-Control-Allow-Methods":"POST,OPTIONS"};
export function OPTIONS(){return new Response(null,{status:204,headers:cors})}
export async function POST(request: Request) {
  await ensureDb();
  const url=new URL(request.url);
  const auth=request.headers.get("authorization")||"";
  const token=(auth.startsWith("Bearer ")?auth.slice(7):request.headers.get("x-trackbase-key")||url.searchParams.get("token")||"").trim();
  if(!token)return Response.json({error:"Credencial ausente"},{status:401,headers:cors});
  const [credential]=await getDb().select().from(apiCredentials).where(eq(apiCredentials.tokenHash,await sha256(token))).limit(1);
  if(!credential||!credential.active)return Response.json({error:"Credencial inválida"},{status:401,headers:cors});
  let body:Record<string,unknown>;
  try{body=await request.json() as Record<string,unknown>}catch{return Response.json({error:"JSON inválido"},{status:400,headers:cors})}
  const externalId=String(pick(body,["id","transaction_id","transactionId","sale_id","saleId","data.id","data.transaction.id","order.id"])||crypto.randomUUID());
  const rawStatus=pick(body,["status","event","type","data.status","data.transaction.status","order.status"]);
  const status=statusOf(rawStatus);
  const rawValue=pick(body,["amount","value","total","price","data.amount","data.value","data.transaction.amount","order.total"]);
  let value=Number(rawValue||0); if(value>10000&&Number.isInteger(value))value=value/100;
  const currency=String(pick(body,["currency","data.currency","data.transaction.currency"])||"BRL").toUpperCase();
  const eventId=String(pick(body,["event_id","eventId","tracking.event_id","metadata.event_id","data.event_id"])||`gw_${credential.provider}_${externalId}_${status}`);
  const now=Math.floor(Date.now()/1000);
  const db=getDb();
  await db.insert(orders).values({id:crypto.randomUUID(),projectId:credential.projectId,externalId,provider:credential.provider,status,value,currency,eventId,createdAt:now,updatedAt:now}).onConflictDoUpdate({target:[orders.provider,orders.externalId],set:{status,value,currency,eventId,updatedAt:now}});
  const eventName=status==="approved"?"Purchase":status==="pending"?"PaymentPending":status==="refunded"?"Refund":status==="chargeback"?"Chargeback":"PaymentCancelled";
  await db.insert(events).values({id:crypto.randomUUID(),projectId:credential.projectId,eventId,eventName,source:"gateway",occurredAt:now,value,currency,payload:JSON.stringify(body),fbclid:String(pick(body,["fbclid","tracking.fbclid","metadata.fbclid"])||""),fbc:String(pick(body,["fbc","tracking.fbc","metadata.fbc"])||""),fbp:String(pick(body,["fbp","tracking.fbp","metadata.fbp"])||""),utmSource:String(pick(body,["utm_source","tracking.utm_source","metadata.utm_source"])||""),utmCampaign:String(pick(body,["utm_campaign","tracking.utm_campaign","metadata.utm_campaign"])||""),utmMedium:String(pick(body,["utm_medium","tracking.utm_medium","metadata.utm_medium"])||""),utmContent:String(pick(body,["utm_content","tracking.utm_content","metadata.utm_content"])||""),utmTerm:String(pick(body,["utm_term","tracking.utm_term","metadata.utm_term"])||"")}).onConflictDoNothing();
  await db.update(apiCredentials).set({lastUsedAt:new Date().toISOString()}).where(eq(apiCredentials.id,credential.id));
  return Response.json({received:true,orderId:externalId,status,event:eventName},{headers:cors});
}
