// Lucro real: faturamento − anúncio − custo do produto − taxas do gateway −
// impostos − despesas fixas (rateadas pelos dias do período). Usado pelo
// Dashboard e pelas Campanhas (nas campanhas, sem despesas fixas).
export type Costs = { productCostPct: number; gatewayFeePct: number; gatewayFeeFixed: number; taxPct: number; otherMonthly: number };
export const ZERO_COSTS: Costs = { productCostPct: 0, gatewayFeePct: 0, gatewayFeeFixed: 0, taxPct: 0, otherMonthly: 0 };

export function normalizeCosts(raw: unknown): Costs {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const n = (key: keyof Costs) => {
    const v = Number(o[key]);
    return Number.isFinite(v) && v > 0 ? v : 0;
  };
  return { productCostPct: n("productCostPct"), gatewayFeePct: n("gatewayFeePct"), gatewayFeeFixed: n("gatewayFeeFixed"), taxPct: n("taxPct"), otherMonthly: n("otherMonthly") };
}

export function hasCosts(c: Costs) {
  return Object.values(c).some((v) => v > 0);
}

// Taxa por gateway (opcional). Quem não tem taxa própria usa a taxa geral.
export type GatewayRate = { feePct: number; feeFixed: number };
export type GatewayRates = Record<string, GatewayRate>;
export type GatewaySales = Record<string, { sales: number; revenue: number }>;

export function normalizeGatewayRates(raw: unknown): GatewayRates {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: GatewayRates = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const name = key.trim().toLowerCase();
    if (!name || !value || typeof value !== "object") continue;
    const v = value as Record<string, unknown>;
    const pct = Number(v.feePct), fixed = Number(v.feeFixed);
    out[name] = {
      feePct: Number.isFinite(pct) && pct > 0 ? pct : 0,
      feeFixed: Number.isFinite(fixed) && fixed > 0 ? fixed : 0,
    };
  }
  return out;
}

// Taxa do gateway: com vendas por gateway, cada um paga a sua taxa; sem essa
// informação, a taxa geral é aplicada sobre o total (comportamento anterior).
export function gatewayCost(c: Costs, revenue: number, sales: number, gatewaySales?: GatewaySales, rates: GatewayRates = {}) {
  if (!gatewaySales || !Object.keys(gatewaySales).length) return (revenue * c.gatewayFeePct) / 100 + sales * c.gatewayFeeFixed;
  let total = 0;
  for (const [provider, g] of Object.entries(gatewaySales)) {
    const rate = rates[provider] ?? { feePct: c.gatewayFeePct, feeFixed: c.gatewayFeeFixed };
    total += (g.revenue * rate.feePct) / 100 + g.sales * rate.feeFixed;
  }
  return total;
}

export function applyCosts(input: { revenue: number; sales: number; spend: number; days?: number; gatewaySales?: GatewaySales }, c: Costs, rates?: GatewayRates) {
  const product = (input.revenue * c.productCostPct) / 100;
  const gateway = gatewayCost(c, input.revenue, input.sales, input.gatewaySales, rates);
  const tax = (input.revenue * c.taxPct) / 100;
  const other = input.days ? (c.otherMonthly / 30) * input.days : 0;
  const total = product + gateway + tax + other;
  return { product, gateway, tax, other, total, profit: input.revenue - input.spend - total };
}
