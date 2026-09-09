import { desc,eq } from "drizzle-orm";
import { ensureDb,getDb } from "@/db";
import { actionHistory } from "@/db/schema";
import { requestUserId,sha256 } from "@/lib/trackbase-security";

export const dynamic="force-dynamic";

export async function GET(request:Request){
 const userId=await requestUserId(request);if(!userId)return Response.json({error:"Não autenticado"},{status:401});
 await ensureDb();
 const workspaceId="ws_"+(await sha256(userId)).slice(0,24);
 const rows=await getDb().select().from(actionHistory).where(eq(actionHistory.workspaceId,workspaceId)).orderBy(desc(actionHistory.createdAt)).limit(100);
 return Response.json({history:rows});
}
