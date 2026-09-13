"use client";
import { useEffect, useState } from "react";
import { isPlanId, type PlanId } from "@/lib/cakto-plans";

export type PlanState = { plan: PlanId | null; hasActive: boolean; loaded: boolean };

let cache: PlanState | null = null;
const listeners = new Set<(s: PlanState) => void>();
function emit(s: PlanState) {
  cache = s;
  listeners.forEach((fn) => fn(s));
}
function load() {
  fetch("/api/billing/cakto/status")
    .then((r) => r.json())
    .then((b) => {
      const s = b.subscription;
      const plan = s && s.status === "active" && isPlanId(s.plan) ? (s.plan as PlanId) : null;
      emit({ plan, hasActive: plan !== null, loaded: true });
    })
    .catch(() => emit({ plan: null, hasActive: false, loaded: true }));
}

// Estado do plano compartilhado (1 fetch p/ sessão, sem refetch por menu).
export function usePlan(): PlanState {
  const [state, setState] = useState<PlanState>(cache ?? { plan: null, hasActive: false, loaded: false });
  useEffect(() => {
    if (cache) {
      setState(cache);
      return;
    }
    listeners.add(setState);
    load();
    return () => {
      listeners.delete(setState);
    };
  }, []);
  return state;
}

// fetch p/ ações de CRIAR/ALTERAR: sem plano (402) manda para /planos em vez
// de mostrar erro seco. Leitura (GET) continua usando fetch normal.
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 402) {
    try {
      const back = typeof location !== "undefined" ? location.pathname : "/";
      location.href = "/planos?return_to=" + encodeURIComponent(back);
    } catch {
      /* sem location, só devolve a resposta */
    }
  }
  return res;
}
