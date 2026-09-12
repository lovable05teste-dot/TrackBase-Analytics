"use client";
// Tela dedicada de recuperação de senha (etapa 1: pedir o código).
// Resposta sempre genérica — não revela se o e-mail existe na base.
import { FormEvent, useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Recuperar() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/auth/codes/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), purpose: "password_reset" }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error || "Não foi possível enviar o código.");
      location.href = `/recuperar/codigo?email=${encodeURIComponent(email.trim())}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível enviar o código.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Recuperar senha" description="Digite o e-mail da sua conta. Se ele estiver cadastrado, você recebe um código de 6 dígitos." backHref="/login" backLabel="Voltar ao login">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="tb-recover-email" className="mb-1.5 flex items-center gap-1.5 text-sm text-slate-300">
            <Mail className="size-3.5 text-slate-500" /> E-mail
          </label>
          <Input
            id="tb-recover-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="voce@empresa.com"
            autoFocus
            required
            autoComplete="email"
            className="h-12"
          />
        </div>
        {error && (
          <p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">
            {error}
          </p>
        )}
        <Button type="submit" disabled={loading || !email.includes("@")} className="h-12 w-full bg-[#ff0030] text-[15px] font-semibold text-white hover:bg-[#d60029] disabled:opacity-60">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Enviando código...
            </span>
          ) : (
            "Enviar código"
          )}
        </Button>
      </form>
    </AuthCard>
  );
}
