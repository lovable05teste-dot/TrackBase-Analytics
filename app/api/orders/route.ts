import {desc,eq,inArray} from "drizzle-orm";
import {ensureDb,getDb} from "@/db";
import {orders,projects} from "@/db/schema";
import {requestUserId,sha256} from "@/lib/trackbase-security";

export async function GET(request:Request){
  const userId=await requestUserId(request);
  if(!userId)return Response.json({error:"Não autenticado"},{status:401});
  await ensureDb();
  const workspaceId="ws_"+(await sha256(userId)).slice(0,24),db=getDb();
  const ps=await db.select({id:projects.id,name:projects.name}).from(projects).where(eq(projects.workspaceId,workspaceId));
  if(!ps.length)return Response.json({orders:[]});
  const rows=await db.select().from(orders).where(inArray(orders.projectId,ps.map(p=>p.id))).orderBy(desc(orders.updatedAt)).limit(200);
  const names=new Map(ps.map(p=>[p.id,p.name]));
  return Response.json({orders:rows.map(row=>({...row,projectName:names.get(row.projectId)||""}))});
}
