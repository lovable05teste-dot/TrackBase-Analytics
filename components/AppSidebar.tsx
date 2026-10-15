"use client";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { NAV_GROUPS } from "@/lib/nav";
import { toolAllowed, toolPlanLabel } from "@/lib/plan-tools";
import { usePlan } from "@/lib/plan-client";

function matches(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

// Marca só o item mais específico: em /integracoes/gateways fica ativo
// "Pedidos por gateway", não também "Integrações".
const ALL_HREFS = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href));
function isActive(pathname: string, href: string) {
  return matches(pathname, href) && !ALL_HREFS.some((other) => other.length > href.length && matches(pathname, other));
}

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const { plan, loaded: planLoaded } = usePlan();
  
  const firstGroupTitle = NAV_GROUPS[0]?.title;
  
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Link href="/" className="flex items-center gap-3 px-2 py-2 mb-6" onClick={onNavigate}>
        <Image src="/ghostscale-logo.png" width={900} height={300} alt="Logo GhostScale" className="h-11 w-auto max-w-[160px] shrink-0 object-contain" />
      </Link>
      <nav className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto pb-4 pr-1">
        {NAV_GROUPS.map((g) => {
          // Abre o primeiro grupo e também o grupo da página atual, para a pessoa
          // sempre ver onde está no menu.
          const expanded = open[g.title] ?? (g.title === firstGroupTitle || g.items.some((item) => isActive(pathname, item.href)));
          const IconComponent = g.items[0]?.icon || ChevronDown;
          return (
            <div key={g.title} className="mb-1">
              <button
                onClick={() => setOpen((s) => ({ ...s, [g.title]: !expanded }))}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[.12em] text-slate-500 transition-colors hover:text-slate-700 dark:hover:text-slate-300"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <IconComponent className="size-3.5 shrink-0" />
                  {g.title}
                </span>
                <ChevronDown className={`size-3.5 transition ${expanded ? "" : "-rotate-90"}`} />
              </button>
              {expanded && (
                <div className="mt-1 space-y-0.5">
                  {g.items.map((item) => {
                    const active = isActive(pathname, item.href);
                    const locked = planLoaded && plan !== null && !toolAllowed(item.href, plan);
                    const minLabel = toolPlanLabel(item.href);
                    const ItemIcon = item.icon;
                    return (
                      <a
                        key={item.href}
                        href={locked ? "/planos" : item.href}
                        onClick={onNavigate}
                        title={locked ? `Incluso no plano ${minLabel} — ver planos` : undefined}
                        className={`
                          flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors
                          ${active && !locked 
                            ? "bg-violet-500/10 font-medium text-violet-700 dark:text-violet-200" 
                            : locked 
                              ? "text-slate-400 hover:text-slate-500 border-l-2 border-[#FF4D67] pl-2" 
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100"}
                        `}
                      >
                        <ItemIcon className={`size-4 shrink-0 ${locked ? "text-[#FF4D67]" : active ? "text-violet-600 dark:text-violet-300" : "text-slate-400"}`} />
                        <span className="truncate">{item.label}</span>
                        {locked && minLabel ? (
                          <span className="ml-auto shrink-0 rounded-md bg-[#FF0030]/10 px-2 py-0.5 text-[10px] font-semibold text-[#FF4D67]">{minLabel}</span>
                        ) : item.badge ? (
                          <span className="ml-auto shrink-0 rounded-md bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-700">{item.badge}</span>
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