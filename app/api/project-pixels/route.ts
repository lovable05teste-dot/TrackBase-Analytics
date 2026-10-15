import { and, eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { projectPixels, projects } from "@/db/schema";
import { encryptSecret, hasActivePlan, hasConflictingOrigin, planRequiredResponse, requestUserId, sha256 } from "@/lib/trackbase-security";

async function context(request:Request) {
  const userId=await requestUserId(request);
  if(!userId)return {error:Response.json({error:"Entre na sua conta."},{status:401})};
  await ensureDb();
  const db=getDb(),workspaceId="ws_"+(await sha256(userId)).slice(0,24),projectId=new URL(request.url).searchParams.get("projectId")||"";
  const [project]=await db.select({id:projects.id,pixelId:projects.pixelId}).from(projects).where(and(eq(projects.id,projectId),eq(projects.workspaceId,workspaceId))).limit(1);
  if(!project)return {error:Response.json({error:"Projeto não encontrado."},{status:404})};
  return {db,userId,project};
}
export async function GET(request:Request) {
  const c=await context(request);if(c.error)return c.error;
  const pixels=await c.db.select({id:projectPixels.id,pixelId:projectPixels.pixelId,name:projectPixels.name,testCode:projectPixels.testCode}).from(projectPixels).where(eq(projectPixels.projectId,c.project.id));
  return Response.json({pixels},{headers:{"Cache-Control":"private, no-store"}});
}
export async function POST(request:Request) {
  if(hasConflictingOrigin(request))return Response.json({error:"Origem inválida."},{status:403});
  const c=await context(request);if(c.error)return c.error;
  if(!(await hasActivePlan(c.userId)))return planRequiredResponse();
  const b=await request.json().catch(()=>null);
  if(!b||typeof b.pixelId!=="string"||!/^\d{6,25}$/.test(b.pixelId)||typeof b.accessToken!=="string"||!b.accessToken.trim()||b.accessToken.length>4096||typeof b.name!=="string"||!b.name.trim()||b.name.length>80||b.testCode!==undefined&&(typeof b.testCode!=="string"||b.testCode.length>100))return Response.json({error:"Confira nome, ID do Pixel e token."},{status:400});
  if(b.pixelId===c.project.pixelId)return Response.json({error:"Este já é o pixel principal do projeto."},{status:409});
  const encrypted=await encryptSecret(b.accessToken.trim());
  await c.db.insert(projectPixels).values({id:crypto.randomUUID(),projectId:c.project.id,pixelId:b.pixelId,name:b.name.trim(),cipher:encrypted.cipher,iv:encrypted.iv,testCode:b.testCode?.trim()||null,createdAt:new Date().toISOString()}).onConflictDoUpdate({target:[projectPixels.projectId,projectPixels.pixelId],set:{name:b.name.trim(),cipher:encrypted.cipher,iv:encrypted.iv,testCode:b.testCode?.trim()||null}});
  return Response.json({saved:true});
}
export async function DELETE(request:Request) {
  if(hasConflictingOrigin(request))return Response.json({error:"Origem inválida."},{status:403});
  const c=await context(request);if(c.error)return c.error;
  if(!(await hasActivePlan(c.userId)))return planRequiredResponse();
  const id=new URL(request.url).searchParams.get("id")||"";
  await c.db.delete(projectPixels).where(and(eq(projectPixels.id,id),eq(projectPixels.projectId,c.project.id)));
  return Response.json({deleted:true});
}
