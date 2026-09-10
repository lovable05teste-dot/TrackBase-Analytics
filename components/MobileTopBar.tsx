"use client";
import { AccountMenu } from "./AccountMenu";

export function MobileTopBar() {
  return (
    <div className="flex items-center gap-3">
      <a href="/" className="flex min-w-0 items-center" aria-label="GhostScale - início">
        <img
          src="/ghostscale-logo.png"
          alt="GhostScale"
          className="h-11 w-auto max-w-[220px] shrink-0 object-contain"
        />
      </a>
      <div className="ml-auto shrink-0">
        <AccountMenu />
      </div>
    </div>
  );
}
