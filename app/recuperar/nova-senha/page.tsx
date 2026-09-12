"use client";
// Recuperação de senha (etapa 3: nova senha). O `token` prova que o código de
// 6 dígitos foi validado (uso único, 15 min). Força: fraca/média/forte.
import { FormEvent, useState } from "react";
import { CheckCircle2, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

function initialToken() {
  try {
    return new URLSearchParams(window.location.search).get("token") || "";
  } catch {
    return "";
  }
}

// Mesmos critérios do cadastro: +1 p/ tamanho, +1 p/ maiúscula+minúscula,
// +1 p/ número, +1 p/ símbolo ou 12+ caracteres.
function strength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) score++;
  if (score <= 1) return { score, label: "Fraca", bar: "[&_[data-slot=progress-indicator]]:bg-red-500", text: "text-red-300" };
  if (score <= 3) return { score, label: "Média", bar: "[&_[data-slot=progress-indicator]]:bg-amber-400", text: "text-amber-200" };
  return { score, label: "Forte", bar: "[&_[data-slot=progress-indicator]]:bg-emerald-400", text: "text-emerald-200" };
}

const RULES = ["Mínimo 8 caracteres", "1 letra maiúscula", "1 número"];

export default function NovaSenha() {
  const [token] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const meter = strength(password);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/auth/password/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resetToken: token, password, confirmPassword: confirm }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error || "Não foi possível salvar.");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <AuthCard title="Senha alterada!" description="Sua nova senha já está valendo. Todas as outras sessões foram encerradas por segurança.">
        <div className="space-y-4 text-center">
          <CheckCircle2 className="mx-auto size-14 animate-in fade-in-0 zoom-in-95 text-emerald-400 duration-300" />
          <Button asChild className="h-12 w-full bg-[#ff0030] text-[15px] font-semibold text-white hover:bg-[#d60029]">
            <a href="/login">Voltar ao login</a>
          </Button>
        </div>
      </AuthCard>
    );
  }

  if (!token) {
    return (
      <AuthCard title="Nova senha" description="Sessão de recuperação inválida. Peça um novo código." backHref="/recuperar" backLabel="Recomeçar">
        <div />
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Nova senha" description="Escolha uma senha forte. Ela passa a valer em todos os dispositivos.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="tb-new-password" className="mb-1.5 flex items-center gap-1.5 text-sm text-slate-300">
            <Lock className="size-3.5 text-slate-500" /> Nova senha
          </label>
          <div className="relative">
            <Input
              id="tb-new-password"
              type={show ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 8, maiúscula e número"
              autoFocus
              required
              autoComplete="new-password"
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
          {password.length > 0 && (
            <div className="mt-2.5 space-y-1.5">
              <Progress value={Math.max(8, meter.score * 25)} className={cn("h-1.5", meter.bar)} />
              <p className={cn("text-xs font-medium", meter.text)}>
                Força: {meter.label} · {RULES.join(" · ")}
              </p>
            </div>
          )}
        </div>
        <div>
          <label htmlFor="tb-new-confirm" className="mb-1.5 flex items-center gap-1.5 text-sm text-slate-300">
            <Lock className="size-3.5 text-slate-500" /> Confirmar nova senha
          </label>
          <div className="relative">
            <Input
              id="tb-new-confirm"
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repita a senha"
              required
              autoComplete="new-password"
              className="h-12 pr-11"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(s => !s)}
              aria-label={showConfirm ? "Ocultar senha" : "Mostrar senha"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-slate-200"
            >
              {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>
        {error && (
          <p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">
            {error}
            {error.includes("Comece de novo") && (
              <>
                {" "}
                <a href="/recuperar" className="font-medium underline underline-offset-2">
                  Pedir novo código
                </a>
              </>
            )}
          </p>
        )}
        <Button type="submit" disabled={loading || !password || !confirm} className="h-12 w-full bg-[#ff0030] text-[15px] font-semibold text-white hover:bg-[#d60029] disabled:opacity-60">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Salvando...
            </span>
          ) : (
            "Salvar nova senha"
          )}
        </Button>
      </form>
    </AuthCard>
  );
}
