"use client";
import { AccountMenu } from "./AccountMenu";

export function MobileTopBar() {
  return (
    <div className="flex items-center gap-3">
      <a href="/" className="flex min-w-0 items-center gap-2" aria-label="GhostScale - início">
        <img
          src="/ghostscale-logo.png"
          alt="GhostScale"
          className="h-8 w-auto shrink-0 object-contain"
        />
        <span className="truncate text-sm font-semibold text-slate-900">GhostScale</span>
      </a>
      <div className="ml-auto shrink-0">
        <AccountMenu />
      </div>
    </div>
  );
}
