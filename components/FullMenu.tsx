"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { NAV_GROUPS } from "@/lib/nav";

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
                  return (
                    <a key={item.href} href={item.href} className={active ? "nav-active justify-between" : "nav-item justify-between"}>
                      <span className="truncate">{item.label}</span>
                      {item.badge ? (
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
    </div>
  );
}
