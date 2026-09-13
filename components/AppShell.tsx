"use client";
import { useState } from "react";
import { BookOpen, Menu, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AppSidebar } from "./AppSidebar";
import { AccountMenu } from "./AccountMenu";

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
    <main className="min-h-screen bg-background text-foreground transition-colors">
      <aside className="fixed inset-y-0 hidden w-72 flex-col border-r border-border bg-card p-5 transition-colors lg:flex">
        <AppSidebar />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] overflow-y-auto bg-card p-5 shadow-2xl">
            <div className="mb-4 flex justify-end">
              <button onClick={() => setMobileOpen(false)} className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-accent" aria-label="Fechar menu">
                <X className="size-4" />
              </button>
            </div>
            <AppSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <section className="lg:pl-72">
        <header className="flex min-h-20 flex-wrap items-center justify-between gap-3 border-b border-border bg-card/80 px-5 py-4 backdrop-blur transition-colors lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-accent lg:hidden" aria-label="Abrir menu">
              <Menu className="size-4" />
            </button>
            <img src="/ghostscale-logo.png" alt="GhostScale" className="h-10 w-auto max-w-[200px] shrink-0 object-contain lg:hidden" />
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold sm:text-xl lg:text-xl">{title}</h1>
              {subtitle ? <p className="hidden text-sm text-muted-foreground sm:block">{subtitle}</p> : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeTracking === true ? (
              <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">● Rastreamento ativo</Badge>
            ) : activeTracking === false ? (
              <a href="/integracoes">
                <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300">● Configuração necessária</Badge>
              </a>
            ) : null}
            <a href="/docs" className="hidden items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:inline-flex">
              <BookOpen className="size-4" />
              Docs
            </a>
            <AccountMenu />
          </div>
        </header>
        <div className="mx-auto max-w-[1500px] p-5 lg:p-8">{children}</div>
      </section>
    </main>
  );
}
