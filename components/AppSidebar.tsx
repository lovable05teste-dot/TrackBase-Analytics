"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, LayoutDashboard, Lock } from "lucide-react";
import { NAV_GROUPS } from "@/lib/nav";
import { toolAllowed, toolPlanLabel } from "@/lib/plan-tools";
import { isPlanId, type PlanId } from "@/lib/cakto-plans";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState<Record<string, boolean>>({
    Principal: true,
    "Análise & Otimização": true,
    "Ferramentas Avançado": false,
  });
  const [plan, setPlan] = useState<PlanId | null>(null);
  const [planLoaded, setPlanLoaded] = useState(false);
  useEffect(() => {
    fetch("/api/billing/cakto/status")
      .then((r) => r.json())
      .then((b) => {
        const s = b.subscription;
        if (s && s.status === "active" && isPlanId(s.plan)) setPlan(s.plan);
      })
      .catch(() => {})
      .finally(() => setPlanLoaded(true));
  }, []);
  return (
    <div className="flex h-full flex-col">
      <a href="/" className="flex items-center gap-3 px-1 py-1">
        <img src="/ghostscale-logo.png" alt="Logo GhostScale" className="h-11 w-auto max-w-[200px] shrink-0 object-contain" />
      </a>
      <nav className="mt-6 flex-1 space-y-5 overflow-y-auto pb-4 pr-1">
        {NAV_GROUPS.map((g) => {
          const expanded = open[g.title] ?? true;
          return (
            <div key={g.title}>
              <button
                onClick={() => setOpen((s) => ({ ...s, [g.title]: !expanded }))}
                className="mb-1 flex w-full items-center justify-between px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300"
              >
                {g.title}
                <ChevronDown className={`size-3.5 transition ${expanded ? "" : "-rotate-90"}`} />
              </button>
              {expanded && (
                <div className="space-y-1">
                  {g.items.map((item) => {
                    const active = isActive(pathname, item.href);
                    const locked = planLoaded && !toolAllowed(item.href, plan);
                    const minLabel = toolPlanLabel(item.href);
                    return (
                      <a
                        key={item.href}
                        href={locked ? "/planos" : item.href}
                        onClick={onNavigate}
                        title={locked ? `Incluso no plano ${minLabel} — ver planos` : undefined}
                        className={active && !locked ? "nav-active justify-between" : "nav-item justify-between"}
                      >
                        <span className="flex items-center gap-2 truncate">
                          {g.title === "Principal" && item.href === "/" ? <LayoutDashboard className="size-4 shrink-0" /> : null}
                          {locked ? <Lock className="size-3.5 shrink-0 text-[#FF4D67]" /> : null}
                          <span className="truncate">{item.label}</span>
                        </span>
                        {locked && minLabel ? (
                          <span className="ml-2 shrink-0 rounded-md bg-[#FF0030]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#FF4D67]">{minLabel}</span>
                        ) : item.badge ? (
                          <span className="ml-2 shrink-0 rounded-md bg-violet-500/20 px-1.5 py-0.5 text-[10px] text-violet-700 dark:text-violet-200">{item.badge}</span>
                        ) : null}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="rounded-xl border border-border bg-card p-3 transition-colors">
        <b className="text-sm">Sua assinatura</b>
        <small className="block text-muted-foreground">Gerencie seu plano</small>
        <a href="/planos" className="mt-2 block rounded-lg bg-violet-600 px-3 py-2 text-center text-xs font-medium text-white hover:bg-violet-500">
          Ver planos
        </a>
      </div>
    </div>
  );
}
