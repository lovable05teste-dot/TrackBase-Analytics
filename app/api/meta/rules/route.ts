import { and,eq } from "drizzle-orm";
import { ensureDb,getDb } from "@/db";
import { automationRules } from "@/db/schema";
import { requestUserId,sha256 } from "@/lib/trackbase-security";

export const dynamic="force-dynamic";
const LEVELS=["campaign","adset","ad"],METRICS=["roas","spend","cpa","ctr","frequency","sales"],OPS=["<",">","<=",">="],ACTIONS=["pause","activate","notify"],WINDOWS=[1,3,7,14,30];
type RuleBody={id?:string;name?:string;level?:string;metric?:string;operator?:string;value?:number;windowDays?:number;minSpend?:number;action?:string;active?:boolean;cooldownHours?:number};
function clean(b:RuleBody){
 const name=String(b.name||"").trim().slice(0,80);
 if(!name)return "Dê um nome para a regra.";
 if(!LEVELS.includes(b.level||""))return "Nível inválido.";
 if(!METRICS.includes(b.metric||""))return "Métrica inválida.";
 if(!OPS.includes(b.operator||""))return "Operador inválido.";
 const value=Number(b.value);
 if(!Number.isFinite(value))return "Valor inválido.";
 const windowDays=Number(b.windowDays);
 if(!WINDOWS.includes(windowDays))return "Janela inválida (1, 3, 7, 14 ou 30 dias).";
 if(!ACTIONS.includes(b.action||""))return "Ação inválida.";
 const minSpend=Math.max(0,Number(b.minSpend||0));
 const cooldownHours=Math.min(168,Math.max(1,Math.round(Number(b.cooldownHours||24))));
 const active=b.active===undefined?1:(b.active?1:0);
 return {name,level:b.level!,metric:b.metric!,operator:b.operator!,value,windowDays,minSpend,action:b.action!,active,cooldownHours};
}
async function ws(userId:string){return "ws_"+(await sha256(userId)).slice(0,24)}

export async function GET(request:Request){
 const userId=await requestUserId(request);if(!userId)return Response.json({error:"Não autenticado"},{status:401});
 await ensureDb();
 const rows=await getDb().select().from(automationRules).where(eq(automationRules.workspaceId,await ws(userId)));
 return Response.json({rules:rows.map(r=>({...r,active:r.active===1||(r.active as unknown)===true}))});
}

export async function POST(request:Request){
 const userId=await requestUserId(request);if(!userId)return Response.json({error:"Não autenticado"},{status:401});
 const body=await request.json().catch(()=>({})) as RuleBody;
 const c=clean(body);if(typeof c==="string")return Response.json({error:c},{status:400});
 await ensureDb();
 const workspaceId=await ws(userId),now=Math.floor(Date.now()/1000),id=crypto.randomUUID();
 await getDb().insert(automationRules).values({id,workspaceId,userId,...c,lastTriggeredAt:null,createdAt:now,updatedAt:now});
 return Response.json({ok:true,id},{status:201});
}

export async function PUT(request:Request){
 const userId=await requestUserId(request);if(!userId)return Response.json({error:"Não autenticado"},{status:401});
 const body=await request.json().catch(()=>({})) as RuleBody;
 if(!body.id)return Response.json({error:"Regra não informada."},{status:400});
 const c=clean(body);if(typeof c==="string")return Response.json({error:c},{status:400});
 await ensureDb();
 const workspaceId=await ws(userId);
 const updated=await getDb().update(automationRules).set({...c,updatedAt:Math.floor(Date.now()/1000)}).where(and(eq(automationRules.id,body.id),eq(automationRules.workspaceId,workspaceId))).returning({id:automationRules.id});
 if(!updated.length)return Response.json({error:"Regra não encontrada."},{status:404});
 return Response.json({ok:true,id:body.id});
}

export async function DELETE(request:Request){
 const userId=await requestUserId(request);if(!userId)return Response.json({error:"Não autenticado"},{status:401});
 const id=new URL(request.url).searchParams.get("id");
 if(!id)return Response.json({error:"Regra não informada."},{status:400});
 await ensureDb();
 const workspaceId=await ws(userId);
 const gone=await getDb().delete(automationRules).where(and(eq(automationRules.id,id),eq(automationRules.workspaceId,workspaceId))).returning({id:automationRules.id});
 if(!gone.length)return Response.json({error:"Regra não encontrada."},{status:404});
 return Response.json({ok:true,id});
}
