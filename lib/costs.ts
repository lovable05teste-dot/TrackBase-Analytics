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

export function applyCosts(input: { revenue: number; sales: number; spend: number; days?: number }, c: Costs) {
  const product = (input.revenue * c.productCostPct) / 100;
  const gateway = (input.revenue * c.gatewayFeePct) / 100 + input.sales * c.gatewayFeeFixed;
  const tax = (input.revenue * c.taxPct) / 100;
  const other = input.days ? (c.otherMonthly / 30) * input.days : 0;
  const total = product + gateway + tax + other;
  return { product, gateway, tax, other, total, profit: input.revenue - input.spend - total };
}
