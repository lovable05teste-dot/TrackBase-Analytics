"use client";
// Shell premium compartilhado das telas de autenticação secundárias
// (recuperar senha, código, nova senha, verificar e-mail): fundo escuro com
// glow sutil + card central. Mesma linguagem do login e do admin.
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

export function AuthCard({
  title,
  description,
  backHref,
  backLabel,
  children,
}: {
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080b12] p-5 text-slate-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(700px 340px at 50% 0%, #ff00301f, transparent 60%), radial-gradient(600px 420px at 90% 100%, #755cff1a, transparent 60%)",
        }}
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#101521] p-6 shadow-[0_16px_60px_#0006] sm:p-8">
        {backHref && (
          <a href={backHref} className="mb-5 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200">
            <ArrowLeft className="size-4" /> {backLabel || "Voltar"}
          </a>
        )}
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{description}</p>
        <div className="mt-5">{children}</div>
      </div>
    </main>
  );
}
