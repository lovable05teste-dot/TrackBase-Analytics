"use client";
import {FormEvent,useState} from "react";
import {BarChart3,Crosshair,Eye,EyeOff,Loader2,Lock,ShieldCheck,Zap} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";

const benefits=[
 {icon:Crosshair,title:"Atribuição por campanha",desc:"UTMs, fbclid, fbp/fbc cruzados com o gasto da Meta."},
 {icon:Zap,title:"CAPI + Pixel deduplicados",desc:"Mesmo event_id no browser e no servidor. Sem venda duplicada."},
 {icon:BarChart3,title:"ROAS real por anúncio",desc:"Gasto da Marketing API x vendas do gateway."},
 {icon:ShieldCheck,title:"Webhook universal",desc:"FortPay, Hotmart, Kiwify e outros no mesmo endpoint."},
];

export default function Login(){
 const[password,setPassword]=useState("");const[show,setShow]=useState(false);
 const[remember,setRemember]=useState(true);const[error,setError]=useState("");const[loading,setLoading]=useState(false);
 async function submit(e:FormEvent){e.preventDefault();setLoading(true);setError("");try{const r=await fetch("/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password})});const b=await r.json();if(!r.ok)throw new Error(b.error||"Não foi possível entrar.");if(!remember)sessionStorage.setItem("tb_noremember","1");location.href="/";}catch(e){setError(e instanceof Error?e.message:"Não foi possível entrar.");}finally{setLoading(false)}}
 return <main className="min-h-screen bg-[#080b12] text-slate-100"><div className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
 <section className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
  <div className="pointer-events-none absolute inset-0" style={{background:"radial-gradient(900px 420px at 15% 10%, #ff003026, transparent 60%), radial-gradient(700px 500px at 90% 90%, #755cff22, transparent 60%), linear-gradient(180deg,#0b0e17 0%,#080b12 100%)"}}/>
  <div className="relative">
   <div className="flex items-center gap-3"><img src="/ghostscale-logo.png" alt="Logo GhostScale" className="h-11 w-auto object-contain"/><div><b className="block text-[15px] leading-tight">GhostScale</b><small className="block text-xs text-slate-500">Meta Ads Intelligence</small></div></div>
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
  <div className="mb-6 lg:hidden"><div className="flex items-center gap-3"><img src="/ghostscale-logo.png" alt="Logo GhostScale" className="h-10 w-auto object-contain"/><div><b className="block text-[15px]">GhostScale</b><small className="block text-xs text-slate-500">Meta Ads Intelligence</small></div></div>
  <h1 className="mt-4 text-2xl font-bold leading-tight">Rastreamento feito para quem domina o <span className="text-red-500">tráfego.</span></h1></div>
  <div className="rounded-2xl border border-white/10 bg-[#101521] p-6 shadow-[0_16px_60px_#0006] sm:p-8">
   <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Entrar no painel</h2><span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300">● online</span></div>
   <p className="mt-1.5 text-sm text-slate-400">Use a senha administrativa. Novo por aqui? <a href="/docs" className="font-medium text-red-400 hover:text-red-300">Ver documentação</a></p>
   <form onSubmit={submit} className="mt-6 space-y-4">
    <div><label htmlFor="tb-password" className="mb-1.5 flex items-center gap-1.5 text-sm text-slate-300"><Lock className="size-3.5 text-slate-500"/> Senha de acesso</label>
     <div className="relative"><Input id="tb-password" type={show?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" autoFocus required autoComplete="current-password" className="h-12 pr-11"/>
      <button type="button" onClick={()=>setShow(s=>!s)} aria-label={show?"Ocultar senha":"Mostrar senha"} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-slate-200">{show?<EyeOff className="size-4"/>:<Eye className="size-4"/>}</button></div></div>
    <div className="flex items-center justify-between text-sm"><label className="flex cursor-pointer items-center gap-2 text-slate-400"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} className="size-4 accent-red-600"/>Manter conectado</label><a href="/docs/faq" className="text-slate-400 hover:text-slate-200">Esqueci a senha</a></div>
    {error&&<p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">{error}</p>}
    <Button type="submit" disabled={loading||!password} className="h-12 w-full bg-[#ff0030] text-[15px] font-semibold text-white hover:bg-[#d60029] disabled:opacity-60">{loading?<span className="inline-flex items-center gap-2"><Loader2 className="size-4 animate-spin"/> Entrando...</span>:"Entrar no painel"}</Button>
    <div className="flex items-center gap-3 text-xs text-slate-600"><span className="h-px flex-1 bg-white/10"/> ou <span className="h-px flex-1 bg-white/10"/></div>
    <div className="grid gap-2">
  <a href="/docs" className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-medium text-slate-200 hover:bg-white/5">Criar conta / ver como funciona</a>
  <a href="/api/auth/google" className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-medium text-slate-200 hover:bg-white/5 hover:text-slate-400">Continuar com Google</a>
</div>
   </form>
   <div className="mt-6 flex items-center justify-center gap-4 border-t border-white/10 pt-5 text-[11px] text-slate-500"><span className="inline-flex items-center gap-1"><ShieldCheck className="size-3.5"/> AES-GCM</span><span>CAPI deduplicado</span><span>LGPD</span></div>
  </div>
  <p className="mt-4 text-center text-xs text-slate-600">Precisa de ajuda? <a href="/docs/faq" className="text-slate-400 hover:text-slate-200">Falar com suporte</a></p>
 </div></section>
 </div></main>;
}
