import {and,desc,eq,inArray} from "drizzle-orm";
import {ensureDb,getDb} from "@/db";
import {events,orders,projects} from "@/db/schema";
import {refreshSessionCookie,requestUserId,sha256} from "@/lib/trackbase-security";

export async function GET(request:Request){
  const userId=await requestUserId(request);
  if(!userId)return Response.json({error:"Não autenticado"},{status:401});
  await ensureDb();
  const workspaceId="ws_"+(await sha256(userId)).slice(0,24),db=getDb();
  const ps=await db.select({id:projects.id,name:projects.name}).from(projects).where(eq(projects.workspaceId,workspaceId));
  if(!ps.length){const refreshed=await refreshSessionCookie(request);return Response.json({orders:[]},refreshed?{headers:{"set-cookie":refreshed}}:undefined)}
  const rows=await db.select().from(orders).where(inArray(orders.projectId,ps.map(p=>p.id))).orderBy(desc(orders.updatedAt)).limit(200);
  const names=new Map(ps.map(p=>[p.id,p.name]));
  const refreshed=await refreshSessionCookie(request);
  return Response.json({orders:rows.map(row=>({...row,projectName:names.get(row.projectId)||""}))},refreshed?{headers:{"set-cookie":refreshed}}:undefined);
}

// Apagar venda de TESTE (Pix gerado pelo próprio dono, por exemplo). Some do
// painel, das campanhas e do funil: apaga o pedido e os eventos dele.
export async function DELETE(request:Request){
  const userId=await requestUserId(request);
  if(!userId)return Response.json({error:"Não autenticado"},{status:401});
  const id=new URL(request.url).searchParams.get("id")||"";
  if(!id)return Response.json({error:"Venda não informada"},{status:400});
  await ensureDb();
  const workspaceId="ws_"+(await sha256(userId)).slice(0,24),db=getDb();
  const ps=await db.select({id:projects.id}).from(projects).where(eq(projects.workspaceId,workspaceId));
  const [order]=ps.length?await db.select().from(orders).where(and(eq(orders.id,id),inArray(orders.projectId,ps.map(p=>p.id)))).limit(1):[];
  if(!order)return Response.json({error:"Venda não encontrada"},{status:404});
  const provider=order.provider.trim().toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"")||"gateway";
  // IDs gerados por eventIdFor (lib/sale-ingest.ts) para cada status.
  const ids=[`purchase_${provider}_${order.externalId}`,...["pending","cancelled","refunded","chargeback"].map(st=>`gw_${provider}_${order.externalId}_${st}`),order.eventId].filter((v):v is string=>Boolean(v));
  await db.delete(events).where(and(eq(events.projectId,order.projectId),inArray(events.eventId,ids)));
  await db.delete(orders).where(eq(orders.id,order.id));
  return Response.json({ok:true});
}
