"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Lock } from "lucide-react";
import { NAV_GROUPS } from "@/lib/nav";
import { toolAllowed, toolPlanLabel } from "@/lib/plan-tools";
import { isPlanId, type PlanId } from "@/lib/cakto-plans";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function FullMenu() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState<Record<string, boolean>>({
    Principal: true,
    "Análise & Otimização": true,
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
    <div className="space-y-5">
      {NAV_GROUPS.map((g) => {
        const expanded = open[g.title] ?? true;
        return (
          <div key={g.title}>
            <button
              type="button"
              onClick={() => setOpen((s) => ({ ...s, [g.title]: !expanded }))}
              className="mb-1 flex w-full items-center justify-between px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-700"
            >
              {g.title}
              <ChevronDown className={`size-3.5 transition ${expanded ? "" : "-rotate-90"}`} />
            </button>
            {expanded ? (
              <div className="space-y-1">
                {g.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const locked = planLoaded && !toolAllowed(item.href, plan);
                  const minLabel = toolPlanLabel(item.href);
                  return (
                    <a key={item.href} href={locked ? "/planos" : item.href} className={active && !locked ? "nav-active justify-between" : "nav-item justify-between"}>
                      <span className="flex items-center gap-1.5 truncate">
                        {locked ? <Lock className="size-3.5 shrink-0 text-[#FF4D67]" /> : null}
                        <span className="truncate">{item.label}</span>
                      </span>
                      {locked && minLabel ? (
                        <span className="ml-2 shrink-0 rounded-md bg-[#FF0030]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#FF4D67]">{minLabel}</span>
                      ) : item.badge ? (
                        <span className="ml-2 shrink-0 rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">{item.badge}</span>
                      ) : null}
                    </a>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
      <a
        href="/planos"
        className="mt-4 block rounded-xl bg-[#ff0030] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#d60029]"
      >
        Ver planos
      </a>
    </div>
  );
}
