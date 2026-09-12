"use client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function VerificarEmail() {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = new URLSearchParams(window.location.search).get("token") || "";
        const r = await fetch("/api/auth/verify-email/confirm", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (!cancelled) setState(r.ok ? "ok" : "error");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080b12] p-5 text-slate-100">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#101521] p-6 text-center sm:p-8">
        <h2 className="text-xl font-semibold">Confirmar e-mail</h2>
        {state === "loading" && (
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="size-4 animate-spin" /> Confirmando...
          </p>
        )}
        {state === "ok" && (
          <p role="status" className="mt-4 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2.5 text-sm text-emerald-200">
            E-mail confirmado. <a href="/login" className="font-medium underline underline-offset-2">Entrar</a>
          </p>
        )}
        {state === "error" && (
          <p role="alert" className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">
            Link inválido ou expirado. <a href="/login" className="font-medium underline underline-offset-2">Pedir outro na tela de login</a>
          </p>
        )}
      </div>
    </main>
  );
}
