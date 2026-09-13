import { cookies } from "next/headers";
import { requireChatGPTUser } from "./chatgpt-auth";
import { getPlanContext, getUserIdFromSessionCookie } from "@/lib/trackbase-security";
import { PlanBanner } from "@/components/PlanBanner";
import {ThemeToggle} from "./theme-toggle";
import {NotificationsBell} from "./notifications-bell";
import {SoundSidebar,SoundMobile} from "./sound-sidebar";
import {MobileMenu} from "@/components/MobileMenu";
import {MobileTopBar} from "@/components/MobileTopBar";
import {AccountMenu} from "@/components/AccountMenu";
import {FullMenu} from "@/components/FullMenu";
import {LayoutDashboard,PlugZap,BarChart3,ShoppingBag,BookOpen,Settings,FlaskConical,LogOut,Volume2} from "lucide-react";
const links=[[LayoutDashboard,"Dashboard","/"],[ShoppingBag,"Vendas","/vendas"],[BarChart3,"Campanhas","/campanhas"],[FlaskConical,"Meta Lab","/meta-lab"],[PlugZap,"Integrações","/integracoes"],[BookOpen,"Documentação","/docs"],[Settings,"Configurações","/configuracoes"]];
export async function PrivateSection({title,description,children}:{title:string;description:string;children?:React.ReactNode}){
 await requireChatGPTUser("/");
 const session=(await cookies()).get("tb_session")?.value;
 const userId=await getUserIdFromSessionCookie(session);
 // Modo visualização: logado navega em tudo; criar/editar é barrado nas APIs (402).
 // Sem plano ativo mostra a faixa "Ver planos" em vez de expulsar para /planos.
 const { hasActive } = await getPlanContext(userId);
  return <main className="min-h-screen bg-slate-50 text-slate-900 lg:pl-64">
   <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-card p-5 lg:flex">
    <a href="/" className="flex shrink-0 items-center gap-3 border-b border-slate-200 pb-6"><img src="/ghostscale-logo.png" alt="GhostScale" className="h-11 w-auto max-w-[200px] object-contain"/></a>
    <nav className="mt-7 min-h-0 flex-1 space-y-1 overflow-y-auto pb-4"><FullMenu/><SoundSidebar/></nav>
    <div className="mt-4 shrink-0 rounded-xl border border-blue-100 bg-blue-50 p-3"><p className="text-xs font-medium text-blue-700">Dados protegidos</p><p className="mt-1 text-xs leading-4 text-slate-500">Eventos e credenciais ficam isolados por projeto.</p></div>
   </aside>
  <div className="min-h-screen"><div className="sticky top-0 z-20 border-b border-slate-200 bg-card/95 px-4 py-3 backdrop-blur lg:hidden"><MobileTopBar/></div>{hasActive?null:<PlanBanner/>}<header className="hidden border-b border-white/[.07] bg-card/80 px-5 py-5 backdrop-blur lg:block lg:px-9"><div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-[.18em] text-blue-600">Workspace</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1><p className="mt-1 text-sm text-slate-500">{description}</p></div><div className="flex items-center gap-2"><NotificationsBell/><a href="/configuracoes#som" title="Sons de venda" aria-label="Sons de venda" className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-blue-300 hover:text-blue-600"><Volume2 className="size-4"/></a><ThemeToggle/><AccountMenu/><a href="/api/auth/logout" className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-blue-300 hover:text-blue-600" aria-label="Sair"><LogOut className="size-4"/></a></div></div></header><div className="border-b border-slate-200 bg-card px-4 py-2 lg:hidden"><MobileMenu/></div><SoundMobile/><div className="mx-auto max-w-[1500px] space-y-6 p-5 lg:p-9">{children||<div className="metric-card rounded-2xl p-10 text-center text-slate-400">Nenhum dado recebido ainda.</div>}</div></div>
 </main>;
}