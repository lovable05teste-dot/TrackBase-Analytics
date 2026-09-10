"use client";
import { useEffect, useRef, useState } from "react";
import { CreditCard, LogOut, Moon, Sun, User, Volume2 } from "lucide-react";

export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setDark(
        document.documentElement.classList.contains("dark") ||
          localStorage.getItem("tb_theme") === "dark"
      );
    } catch {
      /* noop */
    }
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    try {
      localStorage.setItem("tb_theme", next ? "dark" : "light");
      document.documentElement.classList.toggle("dark", next);
    } catch {
      /* noop */
    }
  };

  const item =
    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-100";

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Minha conta"
        aria-expanded={open}
        className="grid size-9 place-items-center rounded-full bg-blue-600 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
      >
        A
      </button>
      {open ? (
        <div className="absolute right-0 top-11 z-50 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-4 py-3">
            <b className="block text-sm text-slate-900">Minha conta</b>
            <small className="text-xs text-slate-500">Workspace principal</small>
          </div>
          <div className="p-2">
            <a href="/conta/perfil" onClick={() => setOpen(false)} className={item}>
              <User className="size-4 shrink-0 text-slate-400" />
              Meu perfil
            </a>
            <a href="/conta/assinatura" onClick={() => setOpen(false)} className={item}>
              <CreditCard className="size-4 shrink-0 text-slate-400" />
              Assinatura
            </a>
            <a href="/configuracoes#som" onClick={() => setOpen(false)} className={item}>
              <Volume2 className="size-4 shrink-0 text-slate-400" />
              Sons de venda
            </a>
            <button type="button" onClick={toggleTheme} className={item}>
              {dark ? (
                <Sun className="size-4 shrink-0 text-slate-400" />
              ) : (
                <Moon className="size-4 shrink-0 text-slate-400" />
              )}
              <span>Tema {dark ? "claro" : "escuro"}</span>
              <span
                className={`ml-auto flex h-5 w-9 items-center rounded-full p-0.5 transition ${
                  dark ? "justify-end bg-blue-600" : "justify-start bg-slate-200"
                }`}
              >
                <span className="size-4 rounded-full bg-white shadow" />
              </span>
            </button>
          </div>
          <div className="border-t border-slate-100 p-2">
            <a
              href="/api/auth/logout"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              <LogOut className="size-4 shrink-0" />
              Sair da conta
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
