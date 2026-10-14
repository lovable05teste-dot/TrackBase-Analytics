import { hasConflictingOrigin } from "@/lib/trackbase-security";
import { requestUserId,sha256 } from "@/lib/trackbase-security";
import { evaluateWorkspace } from "@/lib/meta-rules";
import { ensureDb } from "@/db";

export const dynamic="force-dynamic";

export async function POST(request:Request){
  if (hasConflictingOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
 const userId=await requestUserId(request);if(!userId)return Response.json({error:"Não autenticado"},{status:401});
 const body=await request.json().catch(()=>({})) as {dryRun?:boolean;ruleIds?:string[]};
 try{
  await ensureDb();
  const workspaceId="ws_"+(await sha256(userId)).slice(0,24);
  const out=await evaluateWorkspace({userId,workspaceId,execute:!body.dryRun,ruleIds:Array.isArray(body.ruleIds)?body.ruleIds:undefined});
  return Response.json({...out,mode:body.dryRun?"dry":"live"});
 }catch(e){console.error("rules evaluate",e);return Response.json({error:e instanceof Error?e.message:"Falha ao avaliar regras."},{status:400})}
}
