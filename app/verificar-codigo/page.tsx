"use client";
// Confirmação de e-mail no cadastro (mesmo padrão do recuperação: código de
// 6 dígitos, countdown, reenvio). Reaproveita VerificationCodeInput.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Timer } from "lucide-react";
import { AuthCard } from "@/components/auth-card";
import { VerificationCodeInput } from "@/components/verification-code-input";
import { useCountdown } from "@/components/use-countdown";
import { Button } from "@/components/ui/button";

const CODE_TTL_FALLBACK = 600;

function initialEmail() {
  try {
    return new URLSearchParams(window.location.search).get("email") || "";
  } catch {
    return "";
  }
}

export default function VerificarCodigo() {
  const [email] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const loadingRef = useRef(false);
  const requestedRef = useRef(false);
  const countdown = useCountdown();

  async function requestCode() {
    if (!email || sending) return;
    setSending(true);
    setError("");
    try {
      const r = await fetch("/api/auth/codes/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, purpose: "email_verify" }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error || "Não foi possível enviar o código.");
      setCode("");
      countdown.start(typeof b.expiresIn === "number" ? b.expiresIn : CODE_TTL_FALLBACK);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível enviar o código.");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if (!email || requestedRef.current) return;
    requestedRef.current = true;
    requestCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  async function verify(current: string) {
    if (loadingRef.current || current.length !== 6 || !email) return;
    loadingRef.current = true;
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/auth/codes/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, purpose: "email_verify", code: current }),
      });
      const b = await r.json();
      if (!r.ok) {
        setError(b.error || "Código incorreto. Confira e tente de novo.");
        if (b.expired) countdown.stop();
        return;
      }
      setDone(true);
    } catch {
      setError("Falha de conexão. Confira a internet e tente de novo.");
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setConfirming(false);
    }
  }

  // Disparo automático ao completar os 6 dígitos (+ trava anti-duplo).
  function handleCode(value: string) {
    setCode(value);
    if (value.length === 6) verify(value);
  }

  if (!email) {
    return (
      <AuthCard title="Confirme seu e-mail" description="Faltou o e-mail. Volte ao login e crie sua conta de novo." backHref="/login" backLabel="Voltar ao login">
        <div />
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard title="E-mail confirmado!" description="Sua conta está ativa. Bora rastrear vendas.">
        <div className="space-y-4 text-center">
          <CheckCircle2 className="mx-auto size-14 animate-in fade-in-0 zoom-in-95 text-emerald-400 duration-300" />
          <Button asChild className="h-12 w-full bg-[#ff0030] text-[15px] font-semibold text-white hover:bg-[#d60029]">
            <Link href="/">Entrar no painel</Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Confirme seu e-mail" description={`Enviamos um código de 6 dígitos para ${email}. Ele vale por 10 minutos.`} backHref="/login" backLabel="Voltar">
      <div className="space-y-4">
        <VerificationCodeInput value={code} onChange={handleCode} error={Boolean(error)} disabled={loading || confirming} autoFocus />
        <p className="flex items-center justify-center gap-1.5 text-sm text-slate-400" role="timer" aria-live="polite">
          <Timer className="size-4 text-slate-500" />
          {countdown.expired ? "Código expirado — peça um novo." : <>Expira em <b className="text-slate-200 tabular-nums">{countdown.label}</b></>}
        </p>
        {error && (
          <p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">
            {error}
          </p>
        )}
        <Button
          onClick={() => {
            setConfirming(true);
            verify(code);
          }}
          disabled={code.length !== 6 || loading || confirming}
          className="h-12 w-full bg-[#ff0030] text-[15px] font-semibold text-white hover:bg-[#d60029] disabled:opacity-60"
        >
          {loading || confirming ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Confirmando...
            </span>
          ) : (
            "Confirmar código"
          )}
        </Button>
        <button
          type="button"
          onClick={requestCode}
          disabled={!countdown.expired || sending}
          className="w-full text-center text-sm text-slate-400 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sending ? "Reenviando..." : countdown.expired ? "Reenviar código" : `Reenviar código em ${countdown.label}`}
        </button>
      </div>
    </AuthCard>
  );
}
