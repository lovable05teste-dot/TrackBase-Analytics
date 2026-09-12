"use client";
import { FormEvent, useState } from "react";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminLoginForm() {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [need2fa, setNeed2fa] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!need2fa) {
        const r = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ password }),
        });
        const b = await r.json();
        if (!r.ok) throw new Error(b.error || "Não foi possível entrar.");
        if (b.require2fa) {
          setNeed2fa(true);
          return;
        }
        location.href = "/";
        return;
      }
      const r = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error || "Código inválido.");
      location.href = "/";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080b12] p-5 text-slate-100">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#101521] p-6 shadow-[0_16px_60px_#0006] sm:p-8">
        <h2 className="text-xl font-semibold">Acesso administrativo</h2>
        <p className="mt-1.5 text-sm text-slate-400">Área restrita.</p>
        <form onSubmit={submit} className="mt-5 space-y-4">
          {!need2fa ? (
            <div>
              <label htmlFor="tb-admin-password" className="mb-1.5 flex items-center gap-1.5 text-sm text-slate-300">
                <Lock className="size-3.5 text-slate-500" /> Senha administrativa
              </label>
              <div className="relative">
                <Input
                  id="tb-admin-password"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                  required
                  autoComplete="current-password"
                  className="h-12 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShow(s => !s)}
                  aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-slate-200"
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="tb-admin-code" className="mb-1.5 flex items-center gap-1.5 text-sm text-slate-300">
                <Lock className="size-3.5 text-slate-500" /> Código do autenticador
              </label>
              <Input
                id="tb-admin-code"
                type="text"
                inputMode="numeric"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="000000"
                autoFocus
                required
                autoComplete="one-time-code"
                maxLength={8}
                className="h-12"
              />
            </div>
          )}
          {error && (
            <p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={loading || (!need2fa && !password) || (need2fa && !code)}
            className="h-12 w-full bg-[#ff0030] text-[15px] font-semibold text-white hover:bg-[#d60029] disabled:opacity-60"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Entrando...
              </span>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>
      </div>
    </main>
  );
}
