"use client";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, LayoutDashboard, Lock } from "lucide-react";
import { NAV_GROUPS } from "@/lib/nav";
import { toolAllowed, toolPlanLabel } from "@/lib/plan-tools";
import { usePlan } from "@/lib/plan-client";

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
  const { plan, loaded: planLoaded } = usePlan();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <a href="/" className="flex items-center gap-3 px-2 py-2 mb-6">
        <img src="/ghostscale-logo.png" alt="Logo GhostScale" className="h-11 w-auto max-w-[160px] shrink-0 object-contain" />
      </a>
      <nav className="mt-6 min-h-0 flex-1 space-y-5 overflow-y-auto pb-4 pr-1">
        {NAV_GROUPS.map((g) => {
          const expanded = open[g.title] ?? true;
          return (
            <div key={g.title} className="mb-3">
              <button
                onClick={() => setOpen((s) => ({ ...s, [g.title]: !expanded }))}
                className="w-full flex items-center justify-between px-2 py-2 rounded-xl border border-slate-200 text-sm font-medium uppercase tracking-wider text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-colors"
              >
                {g.title}
                <ChevronDown className={`size-3.5 transition ${expanded ? "" : "-rotate-90"}`} />
              </button>
              {expanded && (
                <div className="mt-2 space-y-1 max-h-[200px] overflow-y-auto">
                  {g.items.map((item) => {
                    const active = isActive(pathname, item.href);
                    // Sem assinatura navega livre (modo visualização); cadeado só p/ tier insuficiente.
                    const locked = planLoaded && plan !== null && !toolAllowed(item.href, plan);
                    const minLabel = toolPlanLabel(item.href);
                    return (
                      <a
                        key={item.href}
                        href={locked ? "/planos" : item.href}
                        onClick={onNavigate}
                        title={locked ? `Incluso no plano ${minLabel} — ver planos` : undefined}
                        className={active && !locked ? "nav-active justify-between" : locked ? "nav-item justify-between border-b border-[#FF4D67] pb-2" : "nav-item justify-between"}
                      >
                        <span className="flex items-center gap-2">
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
      <div className="mt-4 w-full shrink-0">
        <a href="/planos" className="w-full rounded-lg bg-violet-600 px-3 py-2 text-center text-xs font-medium text-white hover:bg-violet-500">
          Ver planos
        </a>
      </div>
    </div>
  );
}