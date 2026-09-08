import { getSql } from "@/db";
import { requestUserId } from "@/lib/trackbase-security";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 const userId=await requestUserId(request);if(!userId)return Response.json({error:"Não autenticado"},{status:401});
 const rows=await getSql().unsafe("SELECT id, ad_account_id, selected FROM meta_accounts ORDER BY account_name");
 return Response.json({rows});
}