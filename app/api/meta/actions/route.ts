import {and,eq} from "drizzle-orm";
import {ensureDb,getDb} from "@/db";
import {metaAccounts} from "@/db/schema";
import {metaConfig,metaJson} from "@/lib/meta";
import {decryptSecret,requestUserId} from "@/lib/trackbase-security";

type Action="activate"|"pause"|"duplicate"|"budget"|"delete";

export async function POST(request:Request){
  try{
    const userId=await requestUserId(request);if(!userId)return Response.json({error:"Não autenticado."},{status:401});
    const body=await request.json() as {accountId?:string;objectId?:string;level?:string;action?:Action;value?:number};
    if(!body.accountId||!body.objectId||!body.action)return Response.json({error:"Ação incompleta."},{status:400});
    if(!["campaign","adset","ad"].includes(body.level||""))return Response.json({error:"Nível inválido."},{status:400});
    await ensureDb();const [account]=await getDb().select().from(metaAccounts).where(and(eq(metaAccounts.id,body.accountId),eq(metaAccounts.userId,userId))).limit(1);
    if(!account)return Response.json({error:"Conta não encontrada."},{status:404});
    const token=await decryptSecret(account.accessTokenCipher,account.accessTokenIv),config=metaConfig(),base=`https://graph.facebook.com/${config.version}/${encodeURIComponent(body.objectId)}`;
    const object=await metaJson<{account_id?:string}>(`${base}?fields=account_id&access_token=${encodeURIComponent(token)}`);
    if(String(object.account_id||"").replace("act_","")!==account.adAccountId)return Response.json({error:"O item não pertence à conta escolhida."},{status:403});
    if(body.action==="delete"){await metaJson(`${base}?access_token=${encodeURIComponent(token)}`,{method:"DELETE"});return Response.json({ok:true,action:body.action})}
    const params=new URLSearchParams({access_token:token});
    if(body.action==="activate")params.set("status","ACTIVE");
    if(body.action==="pause")params.set("status","PAUSED");
    if(body.action==="budget"){if(!body.value||body.value<=0)return Response.json({error:"Informe um orçamento válido."},{status:400});params.set("daily_budget",String(Math.round(body.value*100)))}
    if(body.action==="duplicate"){const copy=new URLSearchParams({access_token:token});if(body.level==="campaign")copy.set("deep_copy","true");const result=await metaJson(`${base}/copies`,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:copy});return Response.json({ok:true,action:body.action,result})}
    const result=await metaJson(base,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:params});
    return Response.json({ok:true,action:body.action,result});
  }catch(error){console.error("Meta action",error);return Response.json({error:error instanceof Error?error.message:"A Meta recusou a alteração."},{status:500})}
}
