"use client";
import { FormEvent, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function initialToken() {
  try {
    return new URLSearchParams(window.location.search).get("token") || "";
  } catch {
    return "";
  }
}

export default function Redefinir() {
  const [token] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword: confirm }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error || "Não foi possível redefinir.");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível redefinir.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080b12] p-5 text-slate-100">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#101521] p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Redefinir senha</h2>
        <p className="mt-1.5 text-sm text-slate-400">O link expira em 20 minutos e só pode ser usado uma vez.</p>
        {done ? (
          <p role="status" className="mt-5 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2.5 text-sm text-emerald-200">
            Senha alterada. <a href="/login" className="font-medium underline underline-offset-2">Entrar</a>
          </p>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="tb-new-password" className="mb-1.5 flex items-center gap-1.5 text-sm text-slate-300">
                <Lock className="size-3.5 text-slate-500" /> Nova senha
              </label>
              <Input id="tb-new-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8, com letras e números" required autoComplete="new-password" className="h-12" />
            </div>
            <div>
              <label htmlFor="tb-new-confirm" className="mb-1.5 flex items-center gap-1.5 text-sm text-slate-300">
                <Lock className="size-3.5 text-slate-500" /> Confirmar nova senha
              </label>
              <Input id="tb-new-confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repita a senha" required autoComplete="new-password" className="h-12" />
            </div>
            {error && (
              <p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">{error}</p>
            )}
            <Button type="submit" disabled={loading || !token || !password} className="h-12 w-full bg-[#ff0030] text-[15px] font-semibold text-white hover:bg-[#d60029] disabled:opacity-60">
              {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Salvando...</span> : "Salvar nova senha"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
