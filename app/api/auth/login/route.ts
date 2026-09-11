import { eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { users } from "@/db/schema";
import { sha256 } from "@/lib/trackbase-security";

function sessionCookie(token: string){
  const secure=process.env.SECURE_COOKIES==="true"||(!process.env.SECURE_COOKIES&&process.env.NODE_ENV==="production")?" Secure;":"";
  return `tb_session=${token}; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=2592000`;
}

export async function POST(request:Request){
  const body=await request.json().catch(()=>({})) as {email?:string;password?:string};
  if(!body.email||!body.password)return Response.json({error:"E-mail ou senha inválidos."},{status:401});
  if(body.email&&body.password){
    try{
      await ensureDb();
      const [user]=await getDb().select().from(users).where(eq(users.email,body.email.trim().toLowerCase())).limit(1);
      if(!user)return Response.json({error:"E-mail ou senha inválidos."},{status:401});
      if(user.passwordHash!==await sha256(body.password))return Response.json({error:"E-mail ou senha inválidos."},{status:401});
      const token=await sha256(`trackbase:${user.passwordHash}`);
      return Response.json({ok:true},{headers:{"set-cookie":sessionCookie(token)}});
    }catch(error){console.error("login email",error);const msg=error instanceof Error?error.message:"";if(/não configurad/i.test(msg))return Response.json({error:"Banco de dados não configurado. Fale com o suporte."},{status:503});      return Response.json({error:"Erro interno."},{status:500})}
  }
}
