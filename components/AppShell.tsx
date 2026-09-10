"use client";
import { useState } from "react";
import { BookOpen, Menu, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AppSidebar } from "./AppSidebar";

export function AppShell({
  title,
  subtitle,
  activeTracking,
  children,
}: {
  title: string;
  subtitle?: string;
  activeTracking?: boolean;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <main className="min-h-screen bg-[#080b12] text-slate-100">
      <aside className="fixed inset-y-0 hidden w-72 border-r border-white/10 bg-[#0b0e17] p-5 lg:block">
        <AppSidebar />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] overflow-y-auto bg-[#0b0e17] p-5">
            <div className="mb-4 flex justify-end">
              <button onClick={() => setMobileOpen(false)} className="rounded-lg border border-white/10 p-2" aria-label="Fechar menu">
                <X className="size-4" />
              </button>
            </div>
            <AppSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <section className="lg:pl-72">
        <header className="flex min-h-20 flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="rounded-lg border border-white/10 p-2 lg:hidden" aria-label="Abrir menu">
              <Menu className="size-4" />
            </button>
            <div>
              <h1 className="text-xl font-semibold">{title}</h1>
              {subtitle ? <p className="hidden text-sm text-slate-500 sm:block">{subtitle}</p> : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeTracking === true ? (
              <Badge className="bg-emerald-500/10 text-emerald-300">● Rastreamento ativo</Badge>
            ) : activeTracking === false ? (
              <a href="/integracoes">
                <Badge className="bg-amber-500/10 text-amber-300">● Configuração necessária</Badge>
              </a>
            ) : null}
            <a href="/docs" className="hidden items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white sm:inline-flex">
              <BookOpen className="size-4" />
              Docs
            </a>
          </div>
        </header>
        <div className="mx-auto max-w-[1500px] p-5 lg:p-8">{children}</div>
      </section>
    </main>
  );
}
