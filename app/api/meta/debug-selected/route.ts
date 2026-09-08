import { getSql } from "@/db";
import { requestUserId } from "@/lib/trackbase-security";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 const userId=await requestUserId(request);if(!userId)return Response.json({error:"Não autenticado"},{status:401});
 const rows=await getSql().unsafe("SELECT id, ad_account_id, selected, pg_typeof(selected) AS t FROM meta_accounts ORDER BY account_name") as Array<Record<string,unknown>>;
 return Response.json({rows:rows.map(r=>({id:r.id,ad:r.ad_account_id,val:r.selected,js:typeof r.selected,col:r.t}))});
}