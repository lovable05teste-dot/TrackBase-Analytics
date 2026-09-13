// Config central e versionada dos planos GhostScale — fonte única da verdade.
// Frontend e backend consultam este arquivo; não espalhar preços/limites.
// Ordem definitiva: Start → Pro → Black → Scale (Scale = mais completo/caro).
// Versionamento: v1 = contratos legados (start 500/3proj, pro 1000/10, scale 2000/20, black ilimitado)
//                v2 = definitivo atual (Start 500/3, Pro 1000/10, Black 2000/20, Scale 3000/30).
// Subscriptions antigas (plan_version = 1 ou null) preservam limites/preços v1.

export type PlanId = "start" | "pro" | "black" | "scale";
export const PLAN_VERSION_CURRENT = 2 as const;
export const PLAN_IDS: PlanId[] = ["start", "pro", "black", "scale"];
export const PLAN_ORDER: Record<PlanId, number> = { start: 0, pro: 1, black: 2, scale: 3 };

// Limites por ciclo de cobrança (mês da assinatura)
export type PlanLimits = {
  projects: number; // ativos
  sales: number; // vendas aprovadas por ciclo (null = ilimitado, nunca usar em v2)
  members: number; // incluindo titular
  workspaces: number;
  // Franquias adicionais — centralizadas; "null" = a definir (sem uso ilimitado)
  heatmapSessions: number | null; // sessões/mês; null = pendente definição comercial
  predictCredits: number | null;
  agentHubCredits: number | null;
  apiRequestsPerMin: number | null;
  storageDays: number; // retenção
};

export type PlanDef = {
  id: PlanId;
  name: string;
  price: number; // mensal BRL
  priceLabel: string;
  version: number;
  limits: PlanLimits;
  highlights: string[]; // bullets do card
  badge?: string; // ex. Recomendado
};

// v2 definitivo (novas contratações)
export const PLANS_V2: Record<PlanId, PlanDef> = {
  start: {
    id: "start",
    name: "Start",
    price: 39.9,
    priceLabel: "R$ 39,90/mês",
    version: 2,
    limits: { projects: 3, sales: 500, members: 1, workspaces: 1, heatmapSessions: null, predictCredits: null, agentHubCredits: null, apiRequestsPerMin: 60, storageDays: 90 },
    highlights: [
      "Anti-Clone nos projetos do plano",
      "Dashboard, projetos, campanhas, vendas e eventos",
      "Relatórios, UTMs e funil",
      "Integrações: Meta, gateways, Pixel & CAPI",
      "UTM Builder, ROAS/CPA, CPA Máximo, nomes, mapa de links, checklist, ativador TikTok",
      "API e webhooks de entrada para receber vendas",
      "Documentação e comunidade",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 69.9,
    priceLabel: "R$ 69,90/mês",
    version: 2,
    badge: "Recomendado",
    limits: { projects: 10, sales: 1000, members: 2, workspaces: 1, heatmapSessions: 1000, predictCredits: 200, agentHubCredits: null, apiRequestsPerMin: 120, storageDays: 180 },
    highlights: [
      "Tudo do Start",
      "Meta Lab + atribuição avançada",
      "Heatmaps (1.000 sessões/mês)",
      "Predict IA (200 créditos/mês)",
      "Blacklist de IP + tráfego inválido",
      "Equipe: até 2 membros",
    ],
  },
  black: {
    id: "black",
    name: "Black",
    price: 89.9,
    priceLabel: "R$ 89,90/mês",
    version: 2,
    limits: { projects: 20, sales: 2000, members: 3, workspaces: 1, heatmapSessions: 5000, predictCredits: 800, agentHubCredits: null, apiRequestsPerMin: 300, storageDays: 365 },
    highlights: [
      "Tudo do Pro",
      "Monitoramento de sites",
      "Offer Lab",
      "Webhooks de saída + API de gestão e exportação",
      "Automações",
      "Franquias maiores de Heatmaps (5k) e Predict (800)",
      "Suporte prioritário",
    ],
  },
  scale: {
    id: "scale",
    name: "Scale",
    price: 119.9,
    priceLabel: "R$ 119,90/mês",
    version: 2,
    limits: { projects: 30, sales: 3000, members: 5, workspaces: 1, heatmapSessions: 20000, predictCredits: 3000, agentHubCredits: 500, apiRequestsPerMin: 600, storageDays: 730 },
    highlights: [
      "Tudo do Black — plano mais completo",
      "Agent Hub (500 créditos/mês)",
      "Maiores franquias de IA e Heatmaps",
      "Maior capacidade: 30 projetos, 3.000 vendas, 5 membros",
    ],
  },
};

// v1 legado — preserva cobranças/benefícios de quem já contratou antes da virada
export const PLANS_V1: Record<PlanId, PlanDef> = {
  start: { id: "start", name: "Start", price: 39.9, priceLabel: "R$ 39,90/mês", version: 1, limits: { projects: 3, sales: 500, members: 1, workspaces: 1, heatmapSessions: null, predictCredits: null, agentHubCredits: null, apiRequestsPerMin: 60, storageDays: 90 }, highlights: [] },
  pro: { id: "pro", name: "Pro", price: 69.9, priceLabel: "R$ 69,90/mês", version: 1, limits: { projects: 10, sales: 1000, members: 3, workspaces: 1, heatmapSessions: null, predictCredits: null, agentHubCredits: null, apiRequestsPerMin: 120, storageDays: 180 }, highlights: [] },
  scale: { id: "scale", name: "Scale (legado)", price: 89.9, priceLabel: "R$ 89,90/mês", version: 1, limits: { projects: 20, sales: 2000, members: 10, workspaces: 1, heatmapSessions: null, predictCredits: null, agentHubCredits: null, apiRequestsPerMin: 300, storageDays: 365 }, highlights: [] },
  black: { id: "black", name: "Black (legado)", price: 119.9, priceLabel: "R$ 119,90/mês", version: 1, limits: { projects: 9999, sales: 999999, members: 99, workspaces: 99, heatmapSessions: null, predictCredits: null, agentHubCredits: null, apiRequestsPerMin: 600, storageDays: 730 }, highlights: [] },
};

// Compat: PLANS aponta para v2 (uso geral); para display de assinatura existente use getEffectivePlan()
export const PLANS = PLANS_V2;
export const EXCESS_PER_SALE = 0.1; // R$ 0,10 — só com aceite explícito + teto (desativado por padrão)

export function isPlanId(v: unknown): v is PlanId {
  return typeof v === "string" && (PLAN_IDS as string[]).includes(v);
}

export function getEffectivePlan(plan: PlanId, version?: number | null): PlanDef {
  if (!version || version >= 2) return PLANS_V2[plan];
  return (PLANS_V1 as Record<string, PlanDef>)[plan] ?? PLANS_V2[plan];
}

// Mapeamento oferta Cakto → plano (envs estáveis; não trocar ids)
const OFFER_ENVS: Record<PlanId, string> = {
  start: "CAKTO_OFFER_START",
  pro: "CAKTO_OFFER_PRO",
  black: "CAKTO_OFFER_BLACK",
  scale: "CAKTO_OFFER_SCALE",
};
export function planOfferId(plan: PlanId): string | null {
  const v = process.env[OFFER_ENVS[plan]];
  return v && v.trim() ? v.trim() : null;
}
export function plansCatalog() {
  return PLAN_IDS.map((id) => {
    const p = PLANS[id];
    return { id, name: p.name, price: p.price, priceLabel: p.priceLabel, limits: p.limits, highlights: p.highlights, badge: p.badge, configured: planOfferId(id) !== null };
  });
}

// Feature keys — granular para RBAC por recurso
export type FeatureKey =
  | "anti_clone"
  | "dashboard"
  | "projects"
  | "campanhas"
  | "vendas"
  | "eventos"
  | "relatorios"
  | "relatorios_utms"
  | "funil"
  | "integracoes"
  | "contas_meta"
  | "gateways"
  | "pixel_capi"
  | "utm_builder"
  | "calc_roas"
  | "cpa_max"
  | "nomes_campanha"
  | "mapa_links"
  | "checklist"
  | "ativador_tiktok"
  | "api_entrada"
  | "webhook_entrada"
  | "docs"
  | "comunidade"
  | "meta_lab"
  | "atribuicao"
  | "heatmaps"
  | "predict"
  | "blacklist"
  | "trafego_invalido"
  | "equipe"
  | "monitoramento"
  | "offer_lab"
  | "webhook_saida"
  | "api_gestao"
  | "automacoes"
  | "agent_hub";

// Plano → features (true = incluso)
const FEATURES: Record<FeatureKey, PlanId> = {
  anti_clone: "start",
  dashboard: "start",
  projects: "start",
  campanhas: "start",
  vendas: "start",
  eventos: "start",
  relatorios: "start",
  relatorios_utms: "start",
  funil: "start",
  integracoes: "start",
  contas_meta: "start",
  gateways: "start",
  pixel_capi: "start",
  utm_builder: "start",
  calc_roas: "start",
  cpa_max: "start",
  nomes_campanha: "start",
  mapa_links: "start",
  checklist: "start",
  ativador_tiktok: "start",
  api_entrada: "start",
  webhook_entrada: "start",
  docs: "start",
  comunidade: "start",
  meta_lab: "pro",
  atribuicao: "pro",
  heatmaps: "pro",
  predict: "pro",
  blacklist: "pro",
  trafego_invalido: "pro",
  equipe: "pro",
  monitoramento: "black",
  offer_lab: "black",
  webhook_saida: "black",
  api_gestao: "black",
  automacoes: "black",
  agent_hub: "scale",
};

export function featureMinPlan(feature: FeatureKey): PlanId {
  return FEATURES[feature];
}
export function canUseFeature(plan: PlanId | null, feature: FeatureKey): boolean {
  if (!plan) return false;
  return PLAN_ORDER[plan] >= PLAN_ORDER[featureMinPlan(feature)];
}

// Compat com plan-tools: href → feature
export const HREF_FEATURE: Record<string, FeatureKey> = {
  "/": "dashboard",
  "/projetos/novo": "projects",
  "/campanhas": "campanhas",
  "/vendas": "vendas",
  "/eventos": "eventos",
  "/relatorios": "relatorios",
  "/relatorios/utms": "relatorios_utms",
  "/funil": "funil",
  "/heatmaps": "heatmaps",
  "/predict": "predict",
  "/atribuicao": "atribuicao",
  "/agent-hub": "agent_hub",
  "/seguranca/anti-clone": "anti_clone",
  "/seguranca/blacklist": "blacklist",
  "/seguranca/trafego-invalido": "trafego_invalido",
  "/seguranca/monitoramento": "monitoramento",
  "/comunidade/rankings": "comunidade",
  "/comunidade/chat": "comunidade",
  "/conta/perfil": "dashboard",
  "/integracoes": "integracoes",
  "/integracoes/gateways": "gateways",
  "/offer-lab": "offer_lab",
  "/contas-meta": "contas_meta",
  "/pixel-capi": "pixel_capi",
  "/ferramentas/utm-builder": "utm_builder",
  "/ferramentas/calculadora-roas": "calc_roas",
  "/ferramentas/cpa-maximo": "cpa_max",
  "/ferramentas/nomes-campanha": "nomes_campanha",
  "/ferramentas/mapa-links": "mapa_links",
  "/ferramentas/checklist": "checklist",
  "/ferramentas/ativador-tiktok": "ativador_tiktok",
  "/webhooks": "webhook_entrada",
  "/docs/api-vendas": "api_entrada",
  "/equipe": "equipe",
  "/configuracoes": "dashboard",
};
export function hrefFeature(href: string): FeatureKey | null {
  return HREF_FEATURE[href] ?? null;
}
