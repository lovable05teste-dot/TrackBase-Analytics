"use client";
import Link from "next/link";
import { AccountMenu, type AccountData } from "./AccountMenu";

interface MobileTopBarProps { accountData: AccountData; }

export function MobileTopBar({ accountData }: MobileTopBarProps) {
  return (
    <div className="flex items-center gap-3">
      <Link href="/" className="flex min-w-0 items-center" aria-label="GhostScale - início">
        <img
          src="/ghostscale-logo.png"
          alt="GhostScale"
          className="h-11 w-auto max-w-[220px] shrink-0 object-contain"
        />
      </Link>
      <div className="ml-auto shrink-0">
        <AccountMenu data={accountData} />
      </div>
    </div>
  );
}
