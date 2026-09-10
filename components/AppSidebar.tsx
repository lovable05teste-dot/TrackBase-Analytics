"use client";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, LayoutDashboard } from "lucide-react";
import { NAV_GROUPS } from "@/lib/nav";

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
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        className={active ? "nav-active justify-between" : "nav-item justify-between"}
                      >
                        <span className="flex items-center gap-2 truncate">
                          {g.title === "Principal" && item.href === "/" ? <LayoutDashboard className="size-4 shrink-0" /> : null}
                          <span className="truncate">{item.label}</span>
                        </span>
                        {item.badge ? (
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
        <b className="text-sm">Kit Bíblico</b>
        <small className="block text-muted-foreground">Administrador</small>
        <a href="/conta/assinatura" className="mt-2 block rounded-lg bg-violet-600 px-3 py-2 text-center text-xs font-medium text-white hover:bg-violet-500">
          Ver assinatura
        </a>
      </div>
    </div>
  );
}
