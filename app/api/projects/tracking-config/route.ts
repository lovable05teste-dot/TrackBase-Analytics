import {and,eq} from "drizzle-orm";
import {ensureDb,getDb} from "@/db";
import {projects} from "@/db/schema";
import {parseTrackingConfig} from "@/lib/tracking-config";
import {hasActivePlan,hasConflictingOrigin,planRequiredResponse,requestUserId,sha256} from "@/lib/trackbase-security";

async function ownedProject(request:Request){
  const userId=await requestUserId(request);if(!userId)return null;
  const workspaceId="ws_"+(await sha256(userId)).slice(0,24),projectId=new URL(request.url).searchParams.get("projectId")||"";
  if(!projectId)return null;
  await ensureDb();
  const [project]=await getDb().select({id:projects.id,trackingConfig:projects.trackingConfig}).from(projects).where(and(eq(projects.id,projectId),eq(projects.workspaceId,workspaceId))).limit(1);
  return project||null;
}

export async function GET(request:Request){
  try{const project=await ownedProject(request);if(!project)return Response.json({error:"Projeto não encontrado."},{status:404});return Response.json({config:parseTrackingConfig(project.trackingConfig)})}
  catch(error){console.error("Tracking config GET",error);return Response.json({error:"Não foi possível carregar as regras."},{status:500})}
}

export async function POST(request:Request){
  if (hasConflictingOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const gateUser=await requestUserId(request);if(gateUser&&!(await hasActivePlan(gateUser)))return planRequiredResponse();
  try{const project=await ownedProject(request);if(!project)return Response.json({error:"Projeto não encontrado."},{status:404});const body=await request.json() as Record<string,unknown>,config=parseTrackingConfig(body.config);await getDb().update(projects).set({trackingConfig:JSON.stringify(config)}).where(eq(projects.id,project.id));return Response.json({saved:true,config})}
  catch(error){console.error("Tracking config POST",error);return Response.json({error:"Não foi possível salvar as regras."},{status:500})}
}
