// Valor do localStorage lido como estado do React, sem setState dentro de efeito.
// Funciona com o evento "storage" (outras abas) e com writeLocal (mesma aba).
import { useSyncExternalStore } from "react";

const EVENT = "gs-local-store";

export function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocal(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* sem persistência (modo privado ou cota cheia) */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
}

function subscribe(key: string) {
  return (notify: () => void) => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === key || e.key === null) notify();
    };
    const onLocal = (e: Event) => {
      if ((e as CustomEvent<string>).detail === key) notify();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENT, onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVENT, onLocal);
    };
  };
}

// No servidor e na hidratação o valor é null; depois da hidratação, o real.
export function useLocalValue(key: string): string | null {
  return useSyncExternalStore(subscribe(key), () => readLocal(key), () => null);
}
