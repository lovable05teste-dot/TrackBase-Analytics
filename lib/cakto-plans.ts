export type PlanId = "start" | "pro" | "scale" | "black";

export const EXCESS_PER_SALE = 0.1;

export const PLANS: Record<
  PlanId,
  { name: string; price: number; priceLabel: string; sales: number | null; projects: string; feats: string[]; hot?: boolean }
> = {
  start: {
    name: "Start",
    price: 39.9,
    priceLabel: "R$ 39,90/mês",
    sales: 500,
    projects: "3 projetos",
    feats: ["3 projetos", "Até 500 vendas/mês inclusas", "Excedente R$ 0,10/venda aprovada", "Relatórios + UTMs + Funil", "Suporte chat"],
  },
  pro: {
    name: "Pro",
    price: 69.9,
    priceLabel: "R$ 69,90/mês",
    sales: 1000,
    projects: "10 projetos",
    hot: true,
    feats: ["10 projetos", "Até 1.000 vendas/mês inclusas", "Excedente R$ 0,10/venda aprovada", "Tudo do Start + Predict IA", "Comunidade + Rankings"],
  },
  scale: {
    name: "Scale",
    price: 89.9,
    priceLabel: "R$ 89,90/mês",
    sales: 2000,
    projects: "20 projetos",
    feats: ["20 projetos", "Até 2.000 vendas/mês inclusas", "Excedente R$ 0,10/venda aprovada", "Tudo do Pro + Anti-Clone + Blacklist", "Monitoramento + Offer Lab"],
  },
  black: {
    name: "Black",
    price: 119.9,
    priceLabel: "R$ 119,90/mês",
    sales: null,
    projects: "Projetos ilimitados",
    feats: ["Projetos ilimitados", "Vendas ilimitadas sem excedente", "Tudo do Scale + Agent Hub", "Onboarding 1:1"],
  },
};

export const PLAN_IDS = Object.keys(PLANS) as PlanId[];

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as string[]).includes(value);
}

const OFFER_ENVS: Record<PlanId, string> = {
  start: "CAKTO_OFFER_START",
  pro: "CAKTO_OFFER_PRO",
  scale: "CAKTO_OFFER_SCALE",
  black: "CAKTO_OFFER_BLACK",
};

export function planOfferId(plan: PlanId): string | null {
  const value = process.env[OFFER_ENVS[plan]];
  return value && value.trim() ? value.trim() : null;
}

export function plansCatalog() {
  return PLAN_IDS.map((id) => ({
    id,
    name: PLANS[id].name,
    price: PLANS[id].price,
    priceLabel: PLANS[id].priceLabel,
    sales: PLANS[id].sales,
    projects: PLANS[id].projects,
    feats: PLANS[id].feats,
    hot: !!PLANS[id].hot,
    configured: planOfferId(id) !== null,
  }));
}
