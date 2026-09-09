import { sha256 } from "@/lib/trackbase-security";

export async function POST(request:Request){
 const body=await request.json().catch(()=>({})) as {password?:string};
 const secret=process.env.ADMIN_PASSWORD;
 if(!secret)return Response.json({error:"Configure ADMIN_PASSWORD na Vercel."},{status:503});
 if(body.password!==secret)return Response.json({error:"Senha incorreta."},{status:401});
 const token=await sha256(`trackbase:${secret}`);
 return Response.json({ok:true},{headers:{"set-cookie":`tb_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`}});
}
