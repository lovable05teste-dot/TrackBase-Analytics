"use client";
// Recuperação de senha (etapa 2: digitar o código de 6 dígitos).
// Envia o código ao abrir (o backend limita reenvio a 1x/60s), conta o tempo
// de validade e só libera "Reenviar" ao zerar. Erro nunca limpa os campos.
import { useEffect, useRef, useState } from "react";
import { Loader2, Timer } from "lucide-react";
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

export default function RecuperarCodigo() {
  const [email] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
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
        body: JSON.stringify({ email, purpose: "password_reset" }),
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

  // Disparo único do envio ao abrir a tela.
  useEffect(() => {
    if (!email || requestedRef.current) return;
    requestedRef.current = true;
    requestCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  // Validação (chamada ao completar os 6 dígitos ou no botão Confirmar).
  // Erro nunca limpa os campos — o usuário corrige e reenvia.
  async function verify(current: string) {
    if (loadingRef.current || current.length !== 6 || !email) return;
    loadingRef.current = true;
    setLoading(true);
    setConfirming(true);
    setError("");
    try {
      const r = await fetch("/api/auth/codes/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, purpose: "password_reset", code: current }),
      });
      const b = await r.json();
      if (!r.ok) {
        setError(b.error || "Código incorreto. Confira e tente de novo.");
        if (b.expired) countdown.stop();
        return;
      }
      location.href = `/recuperar/nova-senha?token=${encodeURIComponent(b.resetToken)}`;
    } catch {
      setError("Falha de conexão. Confira a internet e tente de novo.");
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setConfirming(false);
    }
  }

  // Disparo automático ao completar + trava anti-duplo via loadingRef.
  function handleCode(value: string) {
    setCode(value);
    if (value.length === 6) verify(value);
  }

  if (!email) {
    return (
      <AuthCard title="Digite o código" description="Faltou o e-mail. Volte e informe seu e-mail primeiro." backHref="/recuperar" backLabel="Voltar">
        <div />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Digite o código"
      description={`Enviamos um código de 6 dígitos para ${email}. Ele vale por 10 minutos.`}
      backHref="/recuperar"
      backLabel="Trocar e-mail"
    >
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
        <Button onClick={() => verify(code)} disabled={code.length !== 6 || loading || confirming} className="h-12 w-full bg-[#ff0030] text-[15px] font-semibold text-white hover:bg-[#d60029] disabled:opacity-60">
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
