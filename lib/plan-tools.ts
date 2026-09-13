import type { PlanId } from "./plans";
import { PLAN_ORDER, hrefFeature, featureMinPlan } from "./plans";

// Compat: matriz legada mantida mas agora delega à config central.
// Planos em ordem: start < pro < black < scale.
export const PLAN_RANK = PLAN_ORDER;

export const TOOL_MIN_PLAN: Record<string, PlanId> = Object.fromEntries(
  Object.entries({
    "/": "dashboard",
    "/projetos/novo": "projects",
    "/campanhas": "campanhas",
    "/vendas": "vendas",
    "/eventos": "eventos",
    "/relatorios": "relatorios",
    "/relatorios/utms": "relatorios_utms",
    "/pixel-capi": "pixel_capi",
    "/integracoes": "integracoes",
    "/integracoes/gateways": "gateways",
    "/conta/perfil": "dashboard",
    "/configuracoes": "dashboard",
    "/equipe": "equipe",
    "/ferramentas/utm-builder": "utm_builder",
    "/ferramentas/calculadora-roas": "calc_roas",
    "/ferramentas/cpa-maximo": "cpa_max",
    "/ferramentas/nomes-campanha": "nomes_campanha",
    "/ferramentas/mapa-links": "mapa_links",
    "/ferramentas/checklist": "checklist",
    "/ferramentas/ativador-tiktok": "ativador_tiktok",
    "/webhooks": "webhook_entrada",
    "/docs/api-vendas": "api_entrada",
    "/feedback": "dashboard",
    "/meta-lab": "meta_lab",
    "/campanhas/nova": "campanhas",
    "/funil": "funil",
    "/heatmaps": "heatmaps",
    "/atribuicao": "atribuicao",
    "/seguranca/anti-clone": "anti_clone",
    "/seguranca/blacklist": "blacklist",
    "/seguranca/trafego-invalido": "trafego_invalido",
    "/seguranca/monitoramento": "monitoramento",
    "/contas-meta": "contas_meta",
    "/offer-lab": "offer_lab",
    "/predict": "predict",
    "/agent-hub": "agent_hub",
    "/comunidade/rankings": "comunidade",
    "/conta/assinatura-avancada": "dashboard",
    "/comunidade/chat": "comunidade",
  } as Record<string, string>).map(([href, feat]) => [href, featureMinPlan(feat as never)])
) as Record<string, PlanId>;

const ALWAYS_OPEN = new Set(["/planos", "/conta/assinatura", "/docs", "/login", "/recuperar", "/verificar-codigo", "/termos", "/privacidade"]);

export function toolMinPlan(href: string): PlanId | null {
  if (ALWAYS_OPEN.has(href) || href.startsWith("/docs/")) return null;
  const feat = hrefFeature(href as never);
  if (feat) return featureMinPlan(feat);
  return (TOOL_MIN_PLAN as Record<string, PlanId>)[href] ?? null;
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
