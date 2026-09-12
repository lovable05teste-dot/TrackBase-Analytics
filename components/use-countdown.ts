"use client";
// Contador regressivo mm:ss compartilhado pelas telas de código.
// Uso: start(segundos) após pedir/enviar o código; `expired` libera o reenvio.
import { useEffect, useState } from "react";

export function useCountdown() {
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (deadline === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [deadline ]);

  const remaining = deadline === null ? 0 : Math.max(0, Math.ceil((deadline - now) / 1000));
  const label = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  return {
    remaining,
    label,
    expired: deadline !== null && remaining <= 0,
    start: (seconds: number) => {
      setDeadline(Date.now() + seconds * 1000);
      setNow(Date.now());
    },
    stop: () => setDeadline(null),
  };
}
