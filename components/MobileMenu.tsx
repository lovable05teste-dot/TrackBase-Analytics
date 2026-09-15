"use client";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { FullMenu } from "./FullMenu";
import Link from "next/link";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
        className="flex w-full items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors"
      >
        <Menu className="size-4 shrink-0" />
        Menu
        <span className="ml-auto text-xs font-normal text-muted-foreground">todas as seções</span>
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col bg-card p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
                <img src="/ghostscale-logo.png" alt="GhostScale" className="h-10 w-auto max-w-[200px] object-contain" />
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
                className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>
            <div
              className="flex-1 overflow-y-auto pb-4"
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("a")) setOpen(false);
              }}
            >
              <FullMenu />
            </div>
            <Link
              href="/conta/assinatura"
              className="mt-2 block rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground"
            >
              Ver assinatura
            </Link>
            <a
              href="/api/auth/logout"
              className="mt-2 block rounded-xl border border-slate-200 px-4 py-2.5 text-center text-sm font-medium text-red-600"
            >
              Sair da conta
            </a>
          </div>
        </div>
      ) : null}
    </>
  );
}
