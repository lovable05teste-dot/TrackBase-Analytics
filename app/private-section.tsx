import { requireChatGPTUser } from "./chatgpt-auth";
import {ThemeToggle} from "./theme-toggle";
import {LayoutDashboard,PlugZap,BarChart3,ShoppingBag,LogOut} from "lucide-react";
const links=[[LayoutDashboard,"Dashboard","/"],[ShoppingBag,"Vendas","/vendas"],[BarChart3,"Campanhas","/campanhas"],[PlugZap,"Integrações","/integracoes"]];
export async function PrivateSection({title,description,children}:{title:string;description:string;children?:React.ReactNode}){
 await requireChatGPTUser("/");
 return <main className="min-h-screen bg-slate-50 text-slate-900 lg:pl-64">
  <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-card p-5 lg:block">
   <a href="/" className="flex items-center gap-3 border-b border-slate-200 pb-6"><img src="/trackbase-logo.png" alt="TrackBase Analytics" className="h-10 w-16 object-contain"/><span><b className="block text-sm">TrackBase Analytics</b><small className="text-xs text-slate-600">Sales intelligence</small></span></a>
   <nav className="mt-7 space-y-1">{links.map(([Icon,label,href])=>{const I=Icon as typeof LayoutDashboard;return <a key={href as string} href={href as string} className="nav-item"><I className="size-4"/><span>{label as string}</span></a>})}</nav>
   <div className="absolute bottom-5 left-5 right-5 rounded-xl border border-blue-100 bg-blue-50 p-3"><p className="text-xs font-medium text-blue-700">Dados protegidos</p><p className="mt-1 text-xs leading-4 text-slate-500">Eventos e credenciais ficam isolados por projeto.</p></div>
  </aside>
  <div className="min-h-screen"><header className="border-b border-white/[.07] bg-card/80 px-5 py-5 backdrop-blur lg:px-9"><div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-[.18em] text-blue-600">Workspace</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1><p className="mt-1 text-sm text-slate-500">{description}</p></div><div className="flex items-center gap-2"><ThemeToggle/><a href="/api/auth/logout" className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-blue-300 hover:text-blue-600" aria-label="Sair"><LogOut className="size-4"/></a></div></div></header><nav className="mobile-nav lg:hidden"><a href="/">Dashboard</a><a href="/vendas">Vendas</a><a href="/campanhas">Campanhas</a><a href="/integracoes">Integrações</a></nav><div className="mx-auto max-w-[1500px] space-y-6 p-5 lg:p-9">{children||<div className="metric-card rounded-2xl p-10 text-center text-slate-400">Nenhum dado recebido ainda.</div>}</div></div>
 </main>;
}