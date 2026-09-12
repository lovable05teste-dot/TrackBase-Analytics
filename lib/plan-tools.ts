import type { PlanId } from "./cakto-plans";

// Matriz central ferramenta → plano mínimo (itens 4+6: vitrine/paywall).
// Planos em ordem crescente: start < pro < scale < black.
// Rotas fora da matriz (assinatura, planos, docs, login...) nunca bloqueiam.
export const PLAN_RANK: Record<PlanId, number> = { start: 0, pro: 1, scale: 2, black: 3 };

export const TOOL_MIN_PLAN: Record<string, PlanId> = {
  "/": "start",
  "/projetos/novo": "start",
  "/campanhas": "start",
  "/vendas": "start",
  "/eventos": "start",
  "/relatorios": "start",
  "/relatorios/utms": "start",
  "/pixel-capi": "start",
  "/integracoes": "start",
  "/integracoes/gateways": "start",
  "/conta/perfil": "start",
  "/configuracoes": "start",
  "/equipe": "scale",
  "/ferramentas/utm-builder": "start",
  "/ferramentas/calculadora-roas": "start",
  "/ferramentas/cpa-maximo": "start",
  "/ferramentas/nomes-campanha": "start",
  "/ferramentas/mapa-links": "start",
  "/ferramentas/checklist": "start",
  "/ferramentas/ativador-tiktok": "start",
  "/webhooks": "start",
  "/docs/api-vendas": "start",
  "/feedback": "start",
  "/meta-lab": "pro",
  "/campanhas/nova": "start",
  "/funil": "pro",
  "/heatmaps": "pro",
  "/atribuicao": "pro",
  "/seguranca/anti-clone": "pro",
  "/seguranca/blacklist": "pro",
  "/seguranca/trafego-invalido": "pro",
  "/seguranca/monitoramento": "pro",
  "/contas-meta": "pro",
  "/offer-lab": "pro",
  "/predict": "scale",
  "/agent-hub": "scale",
  "/comunidade/rankings": "scale",
  "/conta/assinatura-avancada": "scale",
  "/comunidade/chat": "black",
};

const ALWAYS_OPEN = new Set(["/planos", "/conta/assinatura", "/docs", "/login", "/recuperar", "/verificar-codigo", "/termos", "/privacidade"]);

export function toolMinPlan(href: string): PlanId | null {
  if (ALWAYS_OPEN.has(href) || href.startsWith("/docs/")) return null;
  return TOOL_MIN_PLAN[href] ?? null;
}

/** true quando o plano do usuário alcança o mínimo da ferramenta. Sem plano = só rotas abertas. */
export function toolAllowed(href: string, plan: PlanId | null): boolean {
  const min = toolMinPlan(href);
  if (!min) return true;
  if (!plan) return false;
  return (PLAN_RANK[plan] ?? -1) >= PLAN_RANK[min];
}

/** Rótulo do plano mínimo para selos de cadeado ("Pro", "Scale"...). */
export function toolPlanLabel(href: string): string | null {
  const min = toolMinPlan(href);
  if (!min) return null;
  return min.charAt(0).toUpperCase() + min.slice(1);
}
