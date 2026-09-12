"use client";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, Lock } from "lucide-react";
import { AppShell } from "./AppShell";
import { NAV_GROUPS } from "@/lib/nav";
import { toolAllowed, toolPlanLabel } from "@/lib/plan-tools";
import { isPlanId, type PlanId } from "@/lib/cakto-plans";

export function VitrineDashboard({ userName }: { userName: string }) {
  const [plan, setPlan] = useState<PlanId | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    fetch("/api/billing/cakto/status")
      .then((r) => r.json())
      .then((b) => {
        const s = b.subscription;
        if (s && s.status === "active" && isPlanId(s.plan)) setPlan(s.plan);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);
  return (
    <AppShell title={`Olá, ${userName}`} subtitle="Explore as ferramentas — assine para desbloquear tudo.">
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-[#FF4D67]/25 bg-gradient-to-br from-[#FF0030]/[.12] via-transparent to-transparent p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <b className="text-lg text-foreground">Sua conta está em modo vitrine</b>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Você pode navegar pelos módulos, mas as ferramentas pagas abrem a tela de planos. Escolha um plano para liberar tudo.
            </p>
          </div>
          <a
            href="/planos"
            className="group inline-flex h-12 items-center gap-2.5 rounded-xl bg-[#ff0030] px-6 text-[15px] font-semibold text-white transition hover:bg-[#d60029]"
          >
            Ver planos
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.75} />
          </a>
        </div>
      </div>
      {NAV_GROUPS.map((g) => (
        <section key={g.title} className="mb-8">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.title}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {g.items.map((item) => {
              const locked = loaded && !toolAllowed(item.href, plan);
              const minLabel = toolPlanLabel(item.href);
              return (
                <a
                  key={item.href}
                  href={locked ? "/planos" : item.href}
                  className={`group relative flex items-center justify-between gap-3 rounded-xl border p-4 transition ${
                    locked
                      ? "border-border bg-card opacity-90 hover:border-[#FF4D67]/40"
                      : "border-border bg-card hover:border-foreground/25"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{item.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {locked ? `Incluso no plano ${minLabel}` : item.badge || "Disponível"}
                    </span>
                  </span>
                  {locked ? (
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#FF0030]/10 text-[#FF4D67]">
                      <Lock className="size-4" />
                    </span>
                  ) : (
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition group-hover:bg-foreground group-hover:text-background">
                      <ArrowUpRight className="size-4" />
                    </span>
                  )}
                </a>
              );
            })}
          </div>
        </section>
      ))}
    </AppShell>
  );
}
