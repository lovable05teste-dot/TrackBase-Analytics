"use client";
import Link from "next/link";
import { AccountMenu, type AccountData } from "./AccountMenu";
import { NotificationsBell } from "@/app/notifications-bell";

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
      {/* O sino é onde se ativa o push no celular; antes só existia no
          cabeçalho do desktop, então o celular nunca recebia notificação. */}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <NotificationsBell />
        <AccountMenu data={accountData} />
      </div>
    </div>
  );
}
