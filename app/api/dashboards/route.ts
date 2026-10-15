import { DashboardScopeError,validateDashboardScope } from "@/lib/dashboard-scope";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { ensureDb,getDb } from "@/db";
import { savedDashboards } from "@/db/schema";
import { dashboardConfigSchema,dashboardCostsSchema } from "@/lib/dashboard-config";
import { hasActivePlan,hasConflictingOrigin,planRequiredResponse,requestUserId,sha256 } from "@/lib/trackbase-security";
async function context(r:Request){const userId=await requestUserId(r);if(!userId)return null;await ensureDb();return {userId,workspaceId:"ws_"+(await sha256(userId)).slice(0,24),db:getDb()}}
export async function GET(r:Request){const c=await context(r);if(!c)return Response.json({error:"Entre na sua conta."},{status:401});const rows=await c.db.select().from(savedDashboards).where(eq(savedDashboards.workspaceId,c.workspaceId)).orderBy(desc(savedDashboards.createdAt));return Response.json({dashboards:rows.map(row=>({id:row.id,name:row.name,config:JSON.parse(row.config)}))},{headers:{"Cache-Control":"private, no-store"}})}
export async function POST(r:Request){
 if(hasConflictingOrigin(r))return Response.json({error:"Origem inválida."},{status:403});
 const c=await context(r);if(!c)return Response.json({error:"Entre na sua conta."},{status:401});if(!(await hasActivePlan(c.userId)))return planRequiredResponse();
 const raw=await r.text();if(raw.length>20000)return Response.json({error:"Conteúdo muito grande."},{status:413});
 let body:unknown;try{body=JSON.parse(raw)}catch{return Response.json({error:"Dados inválidos."},{status:400})}
 const parsed=z.object({id:z.string().min(1).max(100).optional(),name:z.string().trim().min(1).max(80),config:dashboardConfigSchema}).safeParse(body);
 if(!parsed.success)return Response.json({error:parsed.error.issues[0]?.message||"Confira o dashboard."},{status:400});
 if(!parsed.data.config.scope)return Response.json({error:"Vincule pelo menos um projeto e escolha as contas deste dashboard."},{status:400});
 try{await validateDashboardScope(c.db,parsed.data.config.scope,c.userId,c.workspaceId)}catch(e){if(e instanceof DashboardScopeError)return Response.json({error:e.message},{status:409});throw e}
 const id=parsed.data.id||crypto.randomUUID();
 if(parsed.data.id){const [old]=await c.db.select().from(savedDashboards).where(and(eq(savedDashboards.id,id),eq(savedDashboards.workspaceId,c.workspaceId)));if(!old)return Response.json({error:"Dashboard não encontrado."},{status:404});await c.db.update(savedDashboards).set({name:parsed.data.name,config:JSON.stringify(parsed.data.config)}).where(and(eq(savedDashboards.id,id),eq(savedDashboards.workspaceId,c.workspaceId)));return Response.json({dashboard:{...parsed.data,id}})}
 await c.db.insert(savedDashboards).values({id,workspaceId:c.workspaceId,name:parsed.data.name,config:JSON.stringify(parsed.data.config),createdAt:new Date().toISOString()});
 return Response.json({dashboard:{id,...parsed.data}},{status:201});
}
export async function DELETE(r:Request){if(hasConflictingOrigin(r))return Response.json({error:"Origem inválida."},{status:403});const c=await context(r);if(!c)return Response.json({error:"Entre na sua conta."},{status:401});if(!(await hasActivePlan(c.userId)))return planRequiredResponse();const id=new URL(r.url).searchParams.get("id")||"";await c.db.delete(savedDashboards).where(and(eq(savedDashboards.id,id),eq(savedDashboards.workspaceId,c.workspaceId)));return Response.json({deleted:true})}

export async function PATCH(r:Request){
 if(hasConflictingOrigin(r))return Response.json({error:"Origem inválida."},{status:403});
 const c=await context(r);if(!c)return Response.json({error:"Entre na sua conta."},{status:401});if(!(await hasActivePlan(c.userId)))return planRequiredResponse();
 const parsed=z.object({id:z.string().min(1).max(100),costs:dashboardCostsSchema}).safeParse(await r.json().catch(()=>null));
 if(!parsed.success)return Response.json({error:"Confira os custos."},{status:400});
 const where=and(eq(savedDashboards.id,parsed.data.id),eq(savedDashboards.workspaceId,c.workspaceId));
 const [old]=await c.db.select().from(savedDashboards).where(where);if(!old)return Response.json({error:"Dashboard não encontrado."},{status:404});
 const config=dashboardConfigSchema.parse(JSON.parse(old.config));
 const updated=await c.db.update(savedDashboards).set({config:JSON.stringify({...config,costs:parsed.data.costs})}).where(and(where,eq(savedDashboards.config,old.config))).returning({id:savedDashboards.id});
 if(!updated.length)return Response.json({error:"O dashboard mudou. Reabra antes de salvar."},{status:409});
 return Response.json({data:parsed.data.costs});
}
