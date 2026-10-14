import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { ensureDb,getDb } from "@/db";
import { savedDashboards } from "@/db/schema";
import { dashboardConfigSchema } from "@/lib/dashboard-config";
import { hasActivePlan,hasConflictingOrigin,planRequiredResponse,requestUserId,sha256 } from "@/lib/trackbase-security";
async function context(r:Request){const userId=await requestUserId(r);if(!userId)return null;await ensureDb();return {userId,workspaceId:"ws_"+(await sha256(userId)).slice(0,24),db:getDb()}}
export async function GET(r:Request){const c=await context(r);if(!c)return Response.json({error:"Entre na sua conta."},{status:401});const rows=await c.db.select().from(savedDashboards).where(eq(savedDashboards.workspaceId,c.workspaceId)).orderBy(desc(savedDashboards.createdAt));return Response.json({dashboards:rows.map(row=>({id:row.id,name:row.name,config:JSON.parse(row.config)}))},{headers:{"Cache-Control":"private, no-store"}})}
export async function POST(r:Request){
 if(hasConflictingOrigin(r))return Response.json({error:"Origem inválida."},{status:403});
 const c=await context(r);if(!c)return Response.json({error:"Entre na sua conta."},{status:401});if(!(await hasActivePlan(c.userId)))return planRequiredResponse();
 const raw=await r.text();if(raw.length>20000)return Response.json({error:"Conteúdo muito grande."},{status:413});
 let body:unknown;try{body=JSON.parse(raw)}catch{return Response.json({error:"Dados inválidos."},{status:400})}
 const parsed=z.object({name:z.string().trim().min(1).max(80),config:dashboardConfigSchema}).safeParse(body);
 if(!parsed.success)return Response.json({error:parsed.error.issues[0]?.message||"Confira o dashboard."},{status:400});
 const id=crypto.randomUUID();await c.db.insert(savedDashboards).values({id,workspaceId:c.workspaceId,name:parsed.data.name,config:JSON.stringify(parsed.data.config),createdAt:new Date().toISOString()});
 return Response.json({dashboard:{id,...parsed.data}},{status:201});
}
export async function DELETE(r:Request){if(hasConflictingOrigin(r))return Response.json({error:"Origem inválida."},{status:403});const c=await context(r);if(!c)return Response.json({error:"Entre na sua conta."},{status:401});if(!(await hasActivePlan(c.userId)))return planRequiredResponse();const id=new URL(r.url).searchParams.get("id")||"";await c.db.delete(savedDashboards).where(and(eq(savedDashboards.id,id),eq(savedDashboards.workspaceId,c.workspaceId)));return Response.json({deleted:true})}
