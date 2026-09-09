import { eq } from "drizzle-orm";
import { ensureDb,getDb } from "@/db";
import { notificationPrefs } from "@/db/schema";
import { requestUserId,sha256 } from "@/lib/trackbase-security";
import { parsePrefs,sanitizePrefs } from "@/lib/notify";

export const dynamic="force-dynamic";
async function ws(userId:string){return "ws_"+(await sha256(userId)).slice(0,24)}

export async function GET(request:Request){
 const userId=await requestUserId(request);if(!userId)return Response.json({error:"Não autenticado"},{status:401});
 await ensureDb();
 const[row]=await getDb().select().from(notificationPrefs).where(eq(notificationPrefs.workspaceId,await ws(userId))).limit(1);
 return Response.json({prefs:parsePrefs(row?.prefs)});
}

export async function POST(request:Request){
 const userId=await requestUserId(request);if(!userId)return Response.json({error:"Não autenticado"},{status:401});
 const body=await request.json().catch(()=>({}));
 await ensureDb();
 const workspaceId=await ws(userId),db=getDb();
 const[row]=await db.select().from(notificationPrefs).where(eq(notificationPrefs.workspaceId,workspaceId)).limit(1);
 const next={...parsePrefs(row?.prefs),...sanitizePrefs(body)};
 const prefs=JSON.stringify(next),now=Math.floor(Date.now()/1000);
 await db.insert(notificationPrefs).values({workspaceId,prefs,updatedAt:now}).onConflictDoUpdate({target:[notificationPrefs.workspaceId],set:{prefs,updatedAt:now}});
 return Response.json({prefs:next});
}
