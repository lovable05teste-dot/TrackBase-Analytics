import { eq } from "drizzle-orm";
import { ensureDb,getDb } from "@/db";
import { soundPrefs } from "@/db/schema";
import { requestUserId,sha256 } from "@/lib/trackbase-security";
import { parseSoundPrefs,sanitizeSoundPrefs } from "@/lib/sound-prefs";

export const dynamic="force-dynamic";
async function ws(userId:string){return "ws_"+(await sha256(userId)).slice(0,24)}

export async function GET(request:Request){
 const userId=await requestUserId(request);if(!userId)return Response.json({error:"Não autenticado"},{status:401});
 await ensureDb();
 const[row]=await getDb().select().from(soundPrefs).where(eq(soundPrefs.workspaceId,await ws(userId))).limit(1);
 return Response.json({prefs:parseSoundPrefs(row?.prefs),stored:!!row});
}

export async function POST(request:Request){
 const userId=await requestUserId(request);if(!userId)return Response.json({error:"Não autenticado"},{status:401});
 const body=await request.json().catch(()=>({}));
 await ensureDb();
 const workspaceId=await ws(userId),db=getDb();
 const[row]=await db.select().from(soundPrefs).where(eq(soundPrefs.workspaceId,workspaceId)).limit(1);
 const next={...parseSoundPrefs(row?.prefs),...sanitizeSoundPrefs(body)};
 const prefs=JSON.stringify(next),now=Math.floor(Date.now()/1000);
 await db.insert(soundPrefs).values({workspaceId,userId,prefs,updatedAt:now}).onConflictDoUpdate({target:[soundPrefs.workspaceId],set:{userId,prefs,updatedAt:now}});
 return Response.json({prefs:next,stored:true});
}
