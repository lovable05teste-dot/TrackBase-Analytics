"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { NAV_GROUPS } from "@/lib/nav";
import { toolAllowed, toolPlanLabel } from "@/lib/plan-tools";
import { usePlan } from "@/lib/plan-client";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

// Menu de navegação (desktop e mobile — o container define o layout).
// Sem assinatura: navega em TUDO (modo visualização; o PlanBanner explica).
// Com plano abaixo do mínimo da ferramenta: cadeado → /planos (upsell).
export function FullMenu() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const { plan, loaded } = usePlan();
  
  // Initialize open state - only first group open by default
  const firstGroupTitle = NAV_GROUPS[0]?.title;
  
  return (
    <div className="space-y-4">
      {NAV_GROUPS.map((g) => {
        const expanded = open[g.title] ?? g.title === firstGroupTitle;
        const IconComponent = g.items[0]?.icon || ChevronDown;
        return (
          <div key={g.title}>
            <button
              type="button"
              onClick={() => setOpen((s) => ({ ...s, [g.title]: !expanded }))}
              className="mb-1 flex w-full items-center justify-between px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium uppercase tracking-wider text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-colors"
            >
              <span className="flex items-center gap-2">
                <IconComponent className="size-4 shrink-0" />
                {g.title}
              </span>
              <ChevronDown className={`size-3.5 transition ${expanded ? "" : "-rotate-90"}`} />
            </button>
            {expanded ? (
              <div className="space-y-1 pl-2">
                {g.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const locked = loaded && plan !== null && !toolAllowed(item.href, plan);
                  const minLabel = toolPlanLabel(item.href);
                  const ItemIcon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={locked ? "/planos" : item.href}
                      title={locked ? `Incluso no plano ${minLabel} — ver planos` : undefined}
                      className={`
                        flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors
                        ${active && !locked 
                          ? "bg-violet-50 text-violet-700 font-medium" 
                          : locked 
                            ? "text-slate-400 hover:text-slate-500 border-l-2 border-[#FF4D67] pl-2" 
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}
                      `}
                    >
                      <ItemIcon className={`size-4 shrink-0 ${locked ? "text-[#FF4D67]" : active ? "text-violet-600" : "text-slate-400"}`} />
                      <span className="truncate">{item.label}</span>
                      {locked && minLabel ? (
                        <span className="ml-auto shrink-0 rounded-md bg-[#FF0030]/10 px-2 py-0.5 text-[10px] font-semibold text-[#FF4D67]">{minLabel}</span>
                      ) : item.badge ? (
                        <span className="ml-auto shrink-0 rounded-md bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-700">{item.badge}</span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
      {!loaded || plan === null ? (
        <Link
          href="/planos"
          className="mt-4 block rounded-xl bg-[#ff0030] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#d60029]"
        >
          Ver planos
        </Link>
      ) : null}
    </div>
  );
}
