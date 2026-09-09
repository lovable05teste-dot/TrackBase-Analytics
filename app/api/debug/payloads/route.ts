import { desc } from "drizzle-orm";
import { ensureDb,getDb } from "@/db";
import { events } from "@/db/schema";
import { requestUserId } from "@/lib/trackbase-security";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 const userId=await requestUserId(request);if(!userId)return Response.json({error:"Não autenticado"},{status:401});
 await ensureDb();
 const rows=await getDb().select({eventName:events.eventName,source:events.source,eventId:events.eventId,value:events.value,occurredAt:events.occurredAt,payload:events.payload}).from(events).orderBy(desc(events.occurredAt)).limit(5);
 return Response.json({rows:rows.map(r=>({...r,payload:(r.payload||"").slice(0,3000)}))});
}