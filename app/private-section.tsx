import { requireChatGPTUser } from "./chatgpt-auth";
import {LayoutDashboard,PlugZap,BarChart3,ShoppingBag,LogOut} from "lucide-react";
const links=[[LayoutDashboard,"Dashboard","/"],[ShoppingBag,"Vendas","/vendas"],[BarChart3,"Campanhas","/campanhas"],[PlugZap,"Integrações","/integracoes"]];
export async function PrivateSection({title,description,children}:{title:string;description:string;children?:React.ReactNode}){
 await requireChatGPTUser("/");
 return <main className="min-h-screen bg-[#070a11] text-slate-100 lg:pl-64">
  <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-white/[.07] bg-[#0b0f18] p-5 lg:block">
   <a href="/" className="flex items-center gap-3 border-b border-white/[.07] pb-6"><img src="/trackbase-logo.png" alt="TrackBase Analytics" className="h-10 w-16 object-contain"/><span><b className="block text-sm">TrackBase Analytics</b><small className="text-xs text-slate-500">Sales intelligence</small></span></a>
   <nav className="mt-7 space-y-1">{links.map(([Icon,label,href])=>{const I=Icon as typeof LayoutDashboard;return <a key={href as string} href={href as string} className="nav-item"><I className="size-4"/><span>{label as string}</span></a>})}</nav>
   <div className="absolute bottom-5 left-5 right-5 rounded-xl border border-violet-400/15 bg-violet-500/[.06] p-3"><p className="text-xs font-medium text-violet-200">Dados protegidos</p><p className="mt-1 text-[11px] leading-4 text-slate-500">Eventos e credenciais ficam isolados por projeto.</p></div>
  </aside>
  <div className="min-h-screen"><header className="border-b border-white/[.07] bg-[#0b0f18]/90 px-5 py-5 backdrop-blur lg:px-9"><div className="mx-auto flex max-w-[1500px] items-center justify-between"><div><p className="text-xs font-medium uppercase tracking-[.18em] text-violet-300/80">Workspace</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1><p className="mt-1 text-sm text-slate-500">{description}</p></div><a href="/api/auth/logout" className="rounded-lg border border-white/10 p-2 text-slate-400 transition hover:border-white/20 hover:text-white" aria-label="Sair"><LogOut className="size-4"/></a></div></header><div className="mx-auto max-w-[1500px] space-y-6 p-5 lg:p-9">{children||<div className="metric-card rounded-2xl p-10 text-center text-slate-400">Nenhum dado recebido ainda.</div>}</div></div>
 </main>;
}