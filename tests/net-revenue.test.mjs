import { test } from 'node:test';
import assert from 'node:assert/strict';
import { netRevenue } from '../lib/net-revenue.ts';

test('reembolso e chargeback saem da receita e da contagem de vendas', () => {
  const r = netRevenue([
    { provider: 'a', status: 'approved', value: 100 },
    { provider: 'a', status: 'approved', value: 50 },
    { provider: 'a', status: 'refunded', value: 100 },
    { provider: 'b', status: 'chargeback', value: 30 },
  ]);
  assert.equal(r.sales, 2);
  assert.equal(r.revenue, 150);
  assert.equal(r.refundedSales, 2);
  assert.equal(r.refundedRevenue, 130);
});

test('pendente não entra na receita; cada gateway tem seu total', () => {
  const r = netRevenue([
    { provider: 'a', status: 'pending', value: 40 },
    { provider: 'a', status: 'approved', value: 10 },
    { provider: 'b', status: 'approved', value: 20 },
  ]);
  assert.equal(r.revenue, 30);
  assert.equal(r.pendingRevenue, 40);
  assert.deepEqual(r.byProvider, { a: { sales: 1, revenue: 10 }, b: { sales: 1, revenue: 20 } });
});

test('lista vazia e valores inválidos viram zero', () => {
  assert.equal(netRevenue([]).revenue, 0);
  assert.equal(netRevenue([{ provider: 'a', status: 'approved', value: NaN }]).revenue, 0);
});
