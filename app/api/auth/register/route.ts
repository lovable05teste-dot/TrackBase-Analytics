import { eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { users } from "@/db/schema";
import { sha256 } from "@/lib/trackbase-security";

function sessionCookie(token: string){
  const secure=process.env.SECURE_COOKIES==="true"||(!process.env.SECURE_COOKIES&&process.env.NODE_ENV==="production")?" Secure;":"";
  return `tb_session=${token}; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=2592000`;
}

export async function POST(request:Request){
  try{
    await ensureDb();
    const body=await request.json().catch(()=>({})) as {email?:string;password?:string};
    const email=String(body.email||"").trim().toLowerCase();
    const password=String(body.password||"");
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return Response.json({error:"Informe um e-mail válido."},{status:400});
    if(password.length<8)return Response.json({error:"A senha precisa de ao menos 8 caracteres."},{status:400});
    const db=getDb();
    const [existing]=await db.select({id:users.id}).from(users).where(eq(users.email,email)).limit(1);
    if(existing)return Response.json({error:"Este e-mail já está cadastrado. Tente entrar."},{status:409});
    const passwordHash=await sha256(password);
    const id=crypto.randomUUID();
    await db.insert(users).values({id,email,passwordHash,createdAt:Math.floor(Date.now()/1000)});
    const token=await sha256(`trackbase:${passwordHash}`);
    return Response.json({ok:true},{headers:{"set-cookie":sessionCookie(token)}});
  }catch(error){console.error("register",error);const msg=error instanceof Error?error.message:"";if(/não configurad/i.test(msg))return Response.json({error:"Banco de dados não configurado. Fale com o suporte."},{status:503});return Response.json({error:"Erro interno."},{status:500})}
}
