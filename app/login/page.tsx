"use client";
import {FormEvent,useEffect,useState} from "react";
import {ArrowRight,BarChart3,Crosshair,Eye,EyeOff,Fingerprint,Loader2,Lock,Mail,ShieldCheck,User,Zap} from "lucide-react";
import {formatCpf,stripCpf} from "@/lib/cpf";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";

const benefits=[
 {icon:Crosshair,title:"Atribuição por campanha",desc:"UTMs, fbclid, fbp/fbc cruzados com o gasto da Meta."},
 {icon:Zap,title:"CAPI + Pixel deduplicados",desc:"Mesmo event_id no browser e no servidor. Sem venda duplicada."},
 {icon:BarChart3,title:"ROAS real por anúncio",desc:"Gasto da Marketing API x vendas do gateway."},
 {icon:ShieldCheck,title:"Webhook universal",desc:"FortPay, Hotmart, Kiwify e outros no mesmo endpoint."},
];

const oauthErrors:Record<string,string>={config:"Login com Google não configurado ainda. Use e-mail e senha.",cancelado:"Login com Google cancelado.",retorno:"Resposta inválida do Google. Tente de novo.",state_invalid:"Sessão expirada. Tente de novo.",token:"Não foi possível validar com o Google. Tente de novo.",email:"Não recebemos seu e-mail do Google.",internal:"Erro interno. Tente de novo.",start:"Não foi possível iniciar o login com Google."};

export default function Login(){
 const[mode,setMode]=useState<"login"|"register">("login");
 const[email,setEmail]=useState("");const[password,setPassword]=useState("");const[show,setShow]=useState(false);
 const[name,setName]=useState("");const[cpf,setCpf]=useState("");const[confirmPassword,setConfirmPassword]=useState("");
 const[remember,setRemember]=useState(true);const[terms,setTerms]=useState(false);const[error,setError]=useState("");const[loading,setLoading]=useState(false);
 useEffect(()=>{try{const q=new URLSearchParams(window.location.search);const e=q.get("erro");if(e)setError(oauthErrors[e]||"Não foi possível entrar com o Google.");const m=(q.get("modo")||"").toLowerCase();if(m==="register"||m==="cadastro"||m==="criar"||m==="criar-conta")setMode("register");}catch{}},[]);
 async function submit(e:FormEvent){e.preventDefault();setLoading(true);setError("");try{if(mode==="register"&&!terms)throw new Error("Aceite os Termos de Uso para criar sua conta.");if(mode==="register"&&password!==confirmPassword)throw new Error("As senhas não coincidem.");const url=mode==="register"?"/api/auth/register":"/api/auth/login";const payload=mode==="register"?{name:name.trim(),email:email.trim(),cpf:stripCpf(cpf),password,confirmPassword}:{email:email.trim(),password};const r=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});const b=await r.json();if(!r.ok)throw new Error(b.error||"Não foi possível entrar.");if(!remember)sessionStorage.setItem("tb_noremember","1");location.href="/";}catch(e){setError(e instanceof Error?e.message:"Não foi possível entrar.");}finally{setLoading(false)}}
 const submitLabel=mode==="register"?"Criar conta grátis":"Entrar no painel";
 const registerValid=name.trim().length>=3&&email.includes("@")&&stripCpf(cpf).length===11&&password.length>=8&&confirmPassword.length>0&&terms;
 return <main className="min-h-screen bg-[#080b12] text-slate-100"><div className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
 <section className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
  <div className="pointer-events-none absolute inset-0" style={{background:"radial-gradient(900px 420px at 15% 10%, #ff003026, transparent 60%), radial-gradient(700px 500px at 90% 90%, #755cff22, transparent 60%), linear-gradient(180deg,#0b0e17 0%,#080b12 100%)"}}/>
  <div className="relative">
   <div className="flex items-center gap-3"><img src="/ghostscale-logo.png" alt="Logo GhostScale" className="h-11 w-auto object-contain"/><div><b className="block text-xs text-slate-500">Meta Ads Intelligence</b></div></div>
   <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-xs text-red-200"><span className="inline-block size-1.5 rounded-full bg-red-500"/>+ vendas rastreadas em tempo real</div>
   <h1 className="mt-5 max-w-xl text-4xl font-bold leading-[1.1] tracking-tight xl:text-5xl">Rastreamento feito para quem domina o <span className="text-red-500">tráfego.</span></h1>
   <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-slate-400">Quando a operação entra em pressão, você precisa de um sistema que aguente pico de escala, recusa de checkout e troca de gateway <b className="text-slate-200">sem perder nenhuma venda nem o ROAS.</b></p>
   <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-2">{benefits.map(b=><div key={b.title} className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><b.icon className="size-5 text-red-400"/><b className="mt-3 block text-sm">{b.title}</b><small className="mt-1 block text-xs leading-relaxed text-slate-500">{b.desc}</small></div>)}</div>
  </div>
  <div className="relative mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/10 pt-6 text-sm">
   <div><b className="text-lg">CAPI v25.0</b><small className="block text-xs text-slate-500">Pixel + servidor</small></div>
   <div><b className="text-lg">R$ 0,25</b><small className="block text-xs text-slate-500">por venda aprovada</small></div>
   <div><b className="text-lg">D+0</b><small className="block text-xs text-slate-500">venda cai no painel na hora</small></div>
   <small className="w-full text-xs text-slate-600">Taxas transparentes. Sem mensalidade escondida.</small>
  </div>
 </section>
 <section className="flex items-center justify-center border-t border-white/10 bg-[#0b0e17] p-5 sm:p-10 lg:border-l lg:border-t-0"><div className="w-full max-w-md">
  <div className="mb-6 lg:hidden"><div className="flex items-center gap-3"><img src="/ghostscale-logo.png" alt="Logo GhostScale" className="h-10 w-auto object-contain"/><div><small className="block text-xs text-slate-500">Meta Ads Intelligence</small></div></div>
  <h1 className="mt-4 text-2xl font-bold leading-tight">Rastreamento feito para quem domina o <span className="text-red-500">tráfego.</span></h1></div>
  <div className="rounded-2xl border border-white/10 bg-[#101521] p-6 shadow-[0_16px_60px_#0006] sm:p-8">
   <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">{mode==="register"?"Criar sua conta":"Entrar no painel"}</h2><span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300">● online</span></div>
   <p className="mt-1.5 text-sm text-slate-400">{mode==="register"?"Grátis para começar. Leva 20 segundos.":"Entre com seu e-mail ou crie uma conta grátis."} <a href="/docs" className="font-medium text-red-400 hover:text-red-300">Ver documentação</a></p>
   <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/30 p-1 text-sm">{([["login","Entrar"],["register","Criar conta"]] as const).map(([m,label])=><button key={m} type="button" onClick={()=>{setMode(m);setError("")}} className={m===mode?"rounded-lg bg-[#ff0030] px-2 py-2 font-semibold text-white":"rounded-lg px-2 py-2 text-slate-400 hover:bg-white/5 hover:text-slate-200"}>{label}</button>)}</div>
   {mode==="register"&&<div className="mt-4 flex items-center gap-2.5 rounded-xl border border-emerald-400/25 bg-emerald-400/[.07] px-3.5 py-2.5 text-xs leading-relaxed text-emerald-200"><Zap className="size-4 shrink-0"/>Tracking 100% preciso em cada venda — sem depender só do pixel.</div>}
   <form onSubmit={submit} className="mt-5 space-y-4">
    {mode==="register"&&<div><label htmlFor="tb-name" className="mb-1.5 flex items-center gap-1.5 text-sm text-slate-300"><User className="size-3.5 text-slate-500"/> Nome completo</label>
     <Input id="tb-name" type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Seu nome completo" autoFocus required autoComplete="name" maxLength={120} className="h-12"/></div>}
    <div><label htmlFor="tb-email" className="mb-1.5 flex items-center gap-1.5 text-sm text-slate-300"><Mail className="size-3.5 text-slate-500"/> E-mail</label>
     <Input id="tb-email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@empresa.com" autoFocus={mode!=="register"} required autoComplete="email" className="h-12"/></div>
    {mode==="register"&&<div><label htmlFor="tb-cpf" className="mb-1.5 flex items-center gap-1.5 text-sm text-slate-300"><Fingerprint className="size-3.5 text-slate-500"/> CPF</label>
     <Input id="tb-cpf" type="text" inputMode="numeric" value={cpf} onChange={e=>setCpf(formatCpf(e.target.value))} placeholder="000.000.000-00" required maxLength={14} autoComplete="off" className="h-12"/></div>}
    <div><label htmlFor="tb-password" className="mb-1.5 flex items-center gap-1.5 text-sm text-slate-300"><Lock className="size-3.5 text-slate-500"/> Senha</label>
     <div className="relative"><Input id="tb-password" type={show?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==="register"?"Mínimo 8 caracteres":"••••••••"} required minLength={mode==="register"?8:1} autoComplete={mode==="register"?"new-password":"current-password"} className="h-12 pr-11"/>
      <button type="button" onClick={()=>setShow(s=>!s)} aria-label={show?"Ocultar senha":"Mostrar senha"} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-slate-200">{show?<EyeOff className="size-4"/>:<Eye className="size-4"/>}</button></div></div>
    {mode==="register"&&<div><label htmlFor="tb-confirm" className="mb-1.5 flex items-center gap-1.5 text-sm text-slate-300"><Lock className="size-3.5 text-slate-500"/> Confirmar senha</label>
     <Input id="tb-confirm" type={show?"text":"password"} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Repita a senha" required autoComplete="new-password" className="h-12"/></div>}
    {mode==="register"&&<div className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[.02] p-3"><input id="tb-terms" type="checkbox" checked={terms} onChange={e=>setTerms(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-red-600"/><span className="text-xs leading-relaxed text-slate-400">Li e aceito os <a href="/termos" className="font-medium text-slate-200 underline underline-offset-2 hover:text-white">Termos de Uso</a> e a <a href="/privacidade" className="font-medium text-slate-200 underline underline-offset-2 hover:text-white">Política de Privacidade</a>, incluindo a cobrança de R$ 0,25 por venda aprovada.</span></div>}
    <div className="flex items-center justify-between text-sm"><label className="flex cursor-pointer items-center gap-2 text-slate-400"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} className="size-4 accent-red-600"/>Manter conectado</label><a href="/docs/faq" className="text-slate-400 hover:text-slate-200">Esqueci a senha</a></div>
    {error&&<p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">{error}</p>}
    <Button type="submit" disabled={loading||(mode==="register"?!registerValid:(!email||!password))} className="group h-12 w-full bg-[#ff0030] text-[15px] font-semibold text-white hover:bg-[#d60029] hover:shadow-[0_12px_36px_-8px_#ff0030aa] disabled:opacity-60">{loading?<span className="inline-flex items-center gap-2"><Loader2 className="size-4 animate-spin"/> Entrando...</span>:<span className="inline-flex items-center gap-2.5">{submitLabel}<span className="grid size-7 place-items-center rounded-full bg-white/20 transition-all duration-300 group-hover:scale-125 group-hover:bg-white group-hover:text-[#ff0030]"><ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.75}/></span></span>}</Button>
    <div className="flex items-center gap-3 text-xs text-slate-600"><span className="h-px flex-1 bg-white/10"/> ou <span className="h-px flex-1 bg-white/10"/></div>
    <div className="grid gap-2">
  <a href="/api/auth/google" className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-medium text-slate-200 transition-colors hover:bg-white/5 hover:text-white">Continuar com Google</a>
  <a href="/docs" className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 px-4 text-sm text-slate-400 hover:bg-white/5 hover:text-slate-200">Ver como funciona</a>
</div>
   </form>
   <div className="mt-6 flex items-center justify-center gap-4 border-t border-white/10 pt-5 text-[11px] text-slate-500"><span className="inline-flex items-center gap-1"><ShieldCheck className="size-3.5"/> Tracking 100% preciso</span><span>CAPI deduplicado</span><span>LGPD</span></div>
   {mode==="login"&&<p className="mt-3 text-center text-[11px] text-slate-600">Ao entrar, você concorda com os <a href="/termos" className="underline underline-offset-2 hover:text-slate-400">Termos de Uso</a>.</p>}
  </div>
  <p className="mt-4 text-center text-xs text-slate-600">Precisa de ajuda? <a href="/docs/faq" className="text-slate-400 hover:text-slate-200">Falar com suporte</a></p>
 </div></section>
 </div></main>;
}
