"use client";
import { useEffect, useRef, useState } from "react";
import { CreditCard, LogOut, Moon, Sun, User, Volume2, Building2, Crown, ShieldCheck } from "lucide-react";

interface AccountData {
  userName: string;
  userEmail: string;
  workspaceName: string;
  planName: string;
  planStatus: string;
  avatarInitial: string;
}

export function AccountMenu({ data = {userName:"Minha conta",userEmail:"",workspaceName:"",planName:"",planStatus:"",avatarInitial:""} }: { data?: AccountData }) {
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

  const planStatusColors: Record<string, string> = {
    active: "text-emerald-600 bg-emerald-50",
    past_due: "text-amber-600 bg-amber-50",
    canceled: "text-slate-500 bg-slate-50",
    paused: "text-blue-600 bg-blue-50",
    demo: "text-violet-600 bg-violet-50",
    inactive: "text-slate-500 bg-slate-50",
  };
  const planStatusLabel: Record<string, string> = {
    active: "Ativo",
    past_due: "Pagamento pendente",
    canceled: "Cancelado",
    paused: "Pausado",
    demo: "Modo demonstração",
    inactive: "Sem plano",
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Minha conta"
        aria-expanded={open}
        className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-sm font-semibold text-white shadow-sm transition hover:from-violet-500 hover:to-blue-500"
      >
        {data.avatarInitial}
      </button>
      {open ? (
        <div className="absolute right-0 top-11 z-50 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-sm font-semibold text-white">
                {data.avatarInitial}
              </div>
              <div className="min-w-0">
                <b className="block text-sm text-slate-900 truncate">{data.userName}</b>
                <small className="text-xs text-slate-500 truncate block">{data.workspaceName}</small>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                  planStatusColors[data.planStatus] || "text-slate-600 bg-slate-50"
                }`}
              >
                {data.planStatus === "active" ? <Crown className="size-3" /> : data.planStatus === "demo" ? <ShieldCheck className="size-3" /> : null}
                {planStatusLabel[data.planStatus] || data.planStatus}
              </span>
            </div>
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
            <a href="/equipe" onClick={() => setOpen(false)} className={item}>
              <Building2 className="size-4 shrink-0 text-slate-400" />
              Workspace e equipe
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
