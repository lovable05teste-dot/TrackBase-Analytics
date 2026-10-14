import test from "node:test";
import assert from "node:assert/strict";
import { applyCosts, hasCosts, normalizeCosts } from "../lib/costs.ts";

test("lucro real desconta produto, gateway, imposto e despesas rateadas", () => {
  const c = normalizeCosts({ productCostPct: 20, gatewayFeePct: 5, gatewayFeeFixed: 1, taxPct: 6, otherMonthly: 300 });
  const r = applyCosts({ revenue: 1000, sales: 10, spend: 300, days: 7 }, c);
  assert.equal(r.product, 200);
  assert.equal(r.gateway, 60);
  assert.equal(r.tax, 60);
  assert.equal(r.other, 70);
  assert.equal(r.profit, 1000 - 300 - 390);
});

test("sem custos o lucro é faturamento menos anúncio; valores inválidos viram 0", () => {
  const c = normalizeCosts({ productCostPct: "abc", taxPct: -5 });
  assert.equal(hasCosts(c), false);
  assert.equal(applyCosts({ revenue: 500, sales: 3, spend: 200 }, c).profit, 300);
  assert.equal(hasCosts(normalizeCosts([])), false);
});

import { normalizeGatewayRates } from "../lib/costs.ts";

test("cada gateway paga a própria taxa; quem não tem taxa usa a geral", () => {
  const c = normalizeCosts({ gatewayFeePct: 10, gatewayFeeFixed: 2 });
  const rates = normalizeGatewayRates({ Kiwify: { feePct: 5, feeFixed: 1 } });
  const r = applyCosts({ revenue: 300, sales: 3, spend: 0, gatewaySales: { kiwify: { sales: 1, revenue: 100 }, hotmart: { sales: 2, revenue: 200 } } }, c, rates);
  // kiwify: 100*5% + 1*1 = 6 ; hotmart (geral): 200*10% + 2*2 = 24
  assert.equal(r.gateway, 30);
});

test("sem vendas por gateway, o cálculo continua o mesmo de antes", () => {
  const c = normalizeCosts({ gatewayFeePct: 10, gatewayFeeFixed: 2 });
  assert.equal(applyCosts({ revenue: 300, sales: 3, spend: 0 }, c).gateway, 36);
});

test("taxas por gateway inválidas viram 0 e nomes são normalizados", () => {
  assert.deepEqual(normalizeGatewayRates({ " PayT ": { feePct: "x", feeFixed: -3 } }), { payt: { feePct: 0, feeFixed: 0 } });
  assert.deepEqual(normalizeGatewayRates(null), {});
});
