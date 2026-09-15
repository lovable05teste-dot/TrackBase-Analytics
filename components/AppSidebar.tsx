"use client";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { NAV_GROUPS } from "@/lib/nav";
import { toolAllowed, toolPlanLabel } from "@/lib/plan-tools";
import { usePlan } from "@/lib/plan-client";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const { plan, loaded: planLoaded } = usePlan();
  
  const firstGroupTitle = NAV_GROUPS[0]?.title;
  
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Link href="/" className="flex items-center gap-3 px-2 py-2 mb-6" onClick={onNavigate}>
        <img src="/ghostscale-logo.png" alt="Logo GhostScale" className="h-11 w-auto max-w-[160px] shrink-0 object-contain" />
      </Link>
      <nav className="mt-6 min-h-0 flex-1 space-y-4 overflow-y-auto pb-4 pr-1">
        {NAV_GROUPS.map((g) => {
          const expanded = open[g.title] ?? g.title === firstGroupTitle;
          const IconComponent = g.items[0]?.icon || ChevronDown;
          return (
            <div key={g.title} className="mb-3">
              <button
                onClick={() => setOpen((s) => ({ ...s, [g.title]: !expanded }))}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium uppercase tracking-wider text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <IconComponent className="size-4 shrink-0" />
                  {g.title}
                </span>
                <ChevronDown className={`size-3.5 transition ${expanded ? "" : "-rotate-90"}`} />
              </button>
              {expanded && (
                <div className="mt-2 space-y-1">
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