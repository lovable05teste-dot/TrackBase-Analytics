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
