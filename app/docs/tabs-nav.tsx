"use client";
import { usePathname } from "next/navigation";

export function DocsTabs({ tabs }: { tabs: readonly (readonly [string, string])[] }) {
  const pathname = usePathname() || "/docs";
  return (
    <nav className="sticky top-0 z-10 mb-8 flex flex-wrap gap-2 rounded-xl border border-white/10 bg-[#0b0e17]/95 p-2 backdrop-blur">
      {tabs.map(([href, label]) => {
        const active = pathname === href;
        return (
          <a
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${active ? "bg-violet-500/20 font-medium text-violet-200" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
          >
            {label}
          </a>
        );
      })}
    </nav>
  );
}
