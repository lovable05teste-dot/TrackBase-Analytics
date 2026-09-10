import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MobileMenu } from "@/components/MobileMenu";

export const metadata: Metadata = { title: "Documentação — GhostScale", description: "Documentação de integração para gateways, páginas de vendas e administradores." };

const tabs = [
  ["/docs", "Visão geral"],
  ["/docs/gateways", "Gateways"],
  ["/docs/pagina", "Página de vendas"],
  ["/docs/faq", "FAQ"],
  ["/docs/api-vendas", "API de vendas"],
] as const;

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#080b12] text-slate-100">
      <div className="mx-auto max-w-5xl px-5 py-8 lg:px-8">
        <a href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><span className="inline-block h-3 w-3 rotate-180">→</span>Voltar ao dashboard</a>

        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/ghostscale-logo.png" alt="Logo GhostScale" className="h-12 w-auto shrink-0 object-contain" />
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-semibold"><BookOpen className="size-6 text-violet-300" />Documentação</h1>
              <p className="text-sm text-slate-500">Integração, rastreamento e configuração</p>
            </div>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-300">Webhook universal</Badge>
        </header>

        <div className="mb-4 lg:hidden"><MobileMenu /></div>

        <nav className="sticky top-0 z-10 mb-8 flex flex-wrap gap-2 rounded-xl border border-white/10 bg-[#0b0e17]/95 p-2 backdrop-blur">
          {tabs.map(([href, label]) => <a key={href} href={href} className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-white/5 hover:text-white">{label}</a>)}
        </nav>

        {children}

        <footer className="mt-12 border-t border-white/7 pt-6 text-center text-xs text-slate-600">
          GhostScale — Meta Ads Intelligence · <a href="/" className="hover:text-slate-300">Voltar ao painel</a>
        </footer>
      </div>
    </main>
  );
}