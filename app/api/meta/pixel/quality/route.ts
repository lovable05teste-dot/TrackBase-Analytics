import { and,eq,gte,inArray } from "drizzle-orm";
import { ensureDb,getDb } from "@/db";
import { events,projects } from "@/db/schema";
import { capiQuality } from "@/lib/capi-quality";
import { requestUserId,sha256 } from "@/lib/trackbase-security";

export const dynamic="force-dynamic";

// Qualidade das compras enviadas à CAPI nos últimos 7 dias (por projeto).
export async function GET(request:Request){
 const userId=await requestUserId(request);
 if(!userId)return Response.json({error:"Não autenticado."},{status:401});
 await ensureDb();
 const db=getDb(),workspaceId="ws_"+(await sha256(userId)).slice(0,24);
 const projectId=new URL(request.url).searchParams.get("projectId")||"";
 const owned=await db.select({id:projects.id}).from(projects).where(eq(projects.workspaceId,workspaceId));
 const ids=owned.map(p=>p.id).filter(id=>!projectId||id===projectId);
 if(!ids.length)return Response.json({quality:capiQuality([])});
 const since=Math.floor(Date.now()/1000)-7*86400;
 const rows=await db.select({fbc:events.fbc,fbp:events.fbp,payload:events.payload}).from(events).where(and(inArray(events.projectId,ids),eq(events.eventName,"Purchase"),gte(events.occurredAt,since))).limit(2000);
 return Response.json({quality:capiQuality(rows)});
}
