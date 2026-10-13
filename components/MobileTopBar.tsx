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
      {/* Notificações (e ativar o push no celular) ficam em /notificacoes, no menu. */}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <AccountMenu data={accountData} />
      </div>
    </div>
  );
}
