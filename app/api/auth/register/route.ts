import { eq, or } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { users } from "@/db/schema";
import { sha256 } from "@/lib/trackbase-security";
import { stripCpf, validateCpf } from "@/lib/cpf";

function sessionCookie(token: string){
  const secure=process.env.SECURE_COOKIES==="true"||(!process.env.SECURE_COOKIES&&process.env.NODE_ENV==="production")?" Secure;":"";
  return `tb_session=${token}; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=2592000`;
}

export async function POST(request:Request){
  try{
    await ensureDb();
    const body=await request.json().catch(()=>({})) as {name?:string;email?:string;cpf?:string;password?:string;confirmPassword?:string};
    const name=String(body.name||"").trim().replace(/\s+/g," ");
    const email=String(body.email||"").trim().toLowerCase();
    const cpf=stripCpf(body.cpf);
    const password=String(body.password||"");
    const confirmPassword=String(body.confirmPassword||"");
    if(name.length<3||name.length>120)return Response.json({error:"Informe seu nome completo."},{status:400});
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return Response.json({error:"Informe um e-mail válido."},{status:400});
    if(!validateCpf(cpf))return Response.json({error:"CPF inválido. Confira os números."},{status:400});
    if(password.length<8)return Response.json({error:"A senha precisa de ao menos 8 caracteres."},{status:400});
    if(password!==confirmPassword)return Response.json({error:"As senhas não coincidem."},{status:400});
    const db=getDb();
    const [existing]=await db.select({id:users.id}).from(users).where(or(eq(users.email,email),eq(users.cpf,cpf))).limit(1);
    if(existing)return Response.json({error:"Este e-mail ou CPF já está cadastrado. Tente entrar."},{status:409});
    const passwordHash=await sha256(password);
    const id=crypto.randomUUID();
    await db.insert(users).values({id,email,name,cpf,passwordHash,createdAt:Math.floor(Date.now()/1000)});
    const token=await sha256(`trackbase:${passwordHash}`);
    return Response.json({ok:true},{headers:{"set-cookie":sessionCookie(token)}});
  }catch(error){console.error("register",error);const msg=error instanceof Error?error.message:"";if(/não configurad/i.test(msg))return Response.json({error:"Banco de dados não configurado. Fale com o suporte."},{status:503});return Response.json({error:"Erro interno."},{status:500})}
}
