"use client";
// Input de código de 6 dígitos compartilhado (recuperação de senha e
// confirmação de e-mail). Baseado no InputOTP do design system: já trata
// auto-avanço, backspace voltando, colar o código inteiro e teclado numérico
// no mobile. Aqui só aplicamos a identidade GhostScale (dark + acento red).
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";

export function VerificationCodeInput({
  value,
  onChange,
  error,
  disabled,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <InputOTP
      maxLength={6}
      value={value}
      onChange={onChange}
      disabled={disabled}
      autoFocus={autoFocus}
      pattern={REGEXP_ONLY_DIGITS}
      inputMode="numeric"
      autoComplete="one-time-code"
      aria-label="Código de verificação de 6 dígitos"
      aria-invalid={error}
      containerClassName="justify-center gap-2 sm:gap-3"
    >
      <InputOTPGroup className="gap-2 sm:gap-3">
        {[0, 1, 2, 3, 4, 5].map(index => (
          <InputOTPSlot
            key={index}
            index={index}
            className={cn(
              "h-12 w-10 rounded-xl border border-white/10 bg-white/[.03] text-lg font-bold text-slate-100 first:rounded-xl last:rounded-xl sm:h-14 sm:w-12 sm:text-xl",
              "data-[active=true]:border-[#ff0030] data-[active=true]:ring-[#ff0030]/30",
              error && "border-red-500/70",
            )}
          />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}
