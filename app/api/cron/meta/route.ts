import { and,eq,inArray } from "drizzle-orm";
import { ensureDb,getDb } from "@/db";
import { automationRules,metaAccounts,metaLinked,notificationPrefs,orders,projects } from "@/db/schema";
import { accountToken,graph,num } from "@/lib/meta-lab";
import { evaluateWorkspace,logHistory } from "@/lib/meta-rules";
import { metaJson } from "@/lib/meta";
import { parsePrefs } from "@/lib/notify";
import { pushToWorkspace } from "@/lib/push";

export const dynamic="force-dynamic";
export const maxDuration=60;

function authorized(request:Request){
 const required=process.env.CRON_SECRET||"";
 if(!required)return true;
 const url=new URL(request.url);
 return url.searchParams.get("secret")===required||request.headers.get("authorization")===`Bearer ${required}`;
}

async function runRules(){
 await ensureDb();
 const db=getDb();
 const actives=await db.select().from(automationRules).where(eq(automationRules.active,1));
 const seen=new Set<string>(),out:any[]=[];
 for(const r of actives){
  const key=`${r.workspaceId}:${r.userId}`;
  if(seen.has(key))continue;
  seen.add(key);
  try{out.push({workspace:r.workspaceId,...await evaluateWorkspace({userId:r.userId,workspaceId:r.workspaceId,execute:true})});}
  catch(e){out.push({workspace:r.workspaceId,error:e instanceof Error?e.message:"falha"});}
 }
 return {workspaces:seen.size,results:out};
}

async function runDigest(){
 await ensureDb();
 const db=getDb();
 const prefs=await db.select().from(notificationPrefs);
 const out:any[]=[];
 const yest=new Date();yest.setDate(yest.getDate()-1);yest.setHours(0,0,0,0);
 const y0=Math.floor(yest.getTime()/1000),y1=y0+86400;
 for(const p of prefs){
  const parsed=parsePrefs(p.prefs);
  if(!parsed.dailyDigest)continue;
  try{
   const prows=await db.select({id:projects.id,name:projects.name}).from(projects).where(eq(projects.workspaceId,p.workspaceId));
   const pids=prows.map(x=>x.id);
   const ords=await (pids.length?db.select().from(orders).where(inArray(orders.projectId,pids)):[]);
   const day=ords.filter(o=>o.updatedAt>=y0&&o.updatedAt<y1);
   const appr=day.filter(o=>o.status==="approved");
   const val=appr.reduce((s,o)=>s+num(o.value),0);
   const money=`R$ ${val.toFixed(2).replace(".",",").replace(/\B(?=(\d{3})+(?!\d))/g,".")}`;
   await pushToWorkspace(p.workspaceId,{title:`Resumo de ontem · ${money}`,body:`${appr.length} aprovada(s) · ${day.length} movimento(s) · toque para abrir`,url:"/",tag:`tb-digest-${y0}`});
   out.push({workspace:p.workspaceId,sales:day.length,approved:appr.length,value:val});
  }catch(e){out.push({workspace:p.workspaceId,error:e instanceof Error?e.message:"falha"});}
 }
 return {digests:out.length,results:out};
}

export async function GET(request:Request){
 if(!authorized(request))return Response.json({error:"Não autorizado."},{status:401});
 const task=new URL(request.url).searchParams.get("task")||"rules";
 try{
  if(task==="digest")return Response.json({ok:true,...await runDigest()});
  return Response.json({ok:true,...await runRules()});
 }catch(e){console.error("cron meta",e);return Response.json({error:e instanceof Error?e.message:"Falha no cron."},{status:500})}
}
