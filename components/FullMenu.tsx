"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
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
    <nav aria-label="Navegação principal" className="gs-navigation space-y-3">
      {NAV_GROUPS.map((g) => {
        // Abre o primeiro grupo e também o grupo da página atual, para a pessoa
          // sempre ver onde está no menu.
          const expanded = open[g.title] ?? (g.title === firstGroupTitle || g.items.some((item) => isActive(pathname, item.href)));
        const IconComponent = g.items[0]?.icon || ChevronDown;
        return (
          <div key={g.title}>
            <button
              type="button"
              onClick={() => setOpen((s) => ({ ...s, [g.title]: !expanded }))}
              aria-expanded={expanded}
              aria-controls={`nav-${NAV_GROUPS.indexOf(g)}`}
              className="mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[.12em] text-slate-500 transition-colors hover:text-slate-700 dark:hover:text-slate-300"
            >
              <span className="flex min-w-0 items-center gap-2">
                <IconComponent className="size-3.5 shrink-0" />
                {g.title}
              </span>
              <ChevronDown className={`size-3.5 transition ${expanded ? "" : "-rotate-90"}`} />
            </button>
            {expanded ? (
              <div id={`nav-${NAV_GROUPS.indexOf(g)}`} className="space-y-1">
                {g.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const locked = loaded && plan !== null && !toolAllowed(item.href, plan);
                  const minLabel = toolPlanLabel(item.href);
                  const ItemIcon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={locked ? "/planos" : item.href}
                      aria-current={active && !locked ? "page" : undefined}
                      data-active={active && !locked}
                      title={locked ? `Incluso no plano ${minLabel} — ver planos` : undefined}
                      className={`
                        gs-nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors
                        ${active && !locked
                          ? "bg-violet-500/10 font-semibold text-violet-700 dark:text-violet-200 ring-1 ring-violet-500/15"
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
          className="mt-4 block rounded-xl bg-violet-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-violet-700"
        >
          Ver planos
        </Link>
      ) : null}
    </nav>
  );
}
