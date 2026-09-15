import { and,eq } from "drizzle-orm";
import { ensureDb,getDb } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { requestUserId,sha256 } from "@/lib/trackbase-security";

export const dynamic="force-dynamic";

// A chave VAPID pública é enviada ao navegador por definição; nenhum dado de
// usuário ou inscrição é exposto aqui. Isso também permite diagnosticar a
// configuração antes de pedir a permissão do celular.
export async function GET(){
 const publicKey=(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY||process.env.VAPID_PUBLIC_KEY||"").trim();
 return Response.json({configured:Boolean(publicKey&&process.env.VAPID_PRIVATE_KEY),publicKey},{headers:{"cache-control":"no-store"}});
}

export async function POST(request:Request){
 const userId=await requestUserId(request);if(!userId)return Response.json({error:"Não autenticado"},{status:401});
 const body=await request.json().catch(()=>({})) as {endpoint?:string;keys?:{p256dh?:string;auth?:string}};
 const endpoint=(body.endpoint||"").trim(),p256dh=(body.keys?.p256dh||"").trim(),auth=(body.keys?.auth||"").trim();
 if(!endpoint||!p256dh||!auth)return Response.json({error:"Inscrição inválida."},{status:400});
 await ensureDb();
 const workspaceId="ws_"+(await sha256(userId)).slice(0,24);
 await getDb().insert(pushSubscriptions).values({workspaceId,endpoint,p256dh,auth,createdAt:Math.floor(Date.now()/1000)}).onConflictDoNothing();
 return Response.json({ok:true});
}

export async function DELETE(request:Request){
 const userId=await requestUserId(request);if(!userId)return Response.json({error:"Não autenticado"},{status:401});
 const endpoint=new URL(request.url).searchParams.get("endpoint")||"";
 if(!endpoint)return Response.json({error:"Endpoint não informado."},{status:400});
 await ensureDb();
 const workspaceId="ws_"+(await sha256(userId)).slice(0,24);
 await getDb().delete(pushSubscriptions).where(and(eq(pushSubscriptions.workspaceId,workspaceId),eq(pushSubscriptions.endpoint,endpoint)));
 return Response.json({ok:true});
}
