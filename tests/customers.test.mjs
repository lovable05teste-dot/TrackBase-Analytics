import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateCustomers, customerKey } from '../lib/customers.ts';

const base = { currency: 'BRL', customerName: null, customerPhone: null };

test('clientes agrupam por e-mail sem diferenciar maiúsculas e somam só aprovadas', () => {
  const list = aggregateCustomers([
    { ...base, externalId: '1', customerEmail: 'Ana@x.com', customerName: 'Ana', status: 'approved', value: 100, createdAt: 1000 },
    { ...base, externalId: '2', customerEmail: 'ana@x.com ', status: 'approved', value: 50, createdAt: 2000 },
    { ...base, externalId: '3', customerEmail: 'ana@x.com', status: 'pending', value: 80, createdAt: 3000 },
  ]);
  assert.equal(list.length, 1);
  assert.equal(list[0].name, 'Ana');
  assert.equal(list[0].approvedCount, 2);
  assert.equal(list[0].pendingCount, 1);
  assert.equal(list[0].revenue, 150);
  assert.equal(list[0].averageTicket, 75);
  assert.equal(list[0].firstOrderAt, 1000);
  assert.equal(list[0].lastOrderAt, 3000);
});

test('sem e-mail cai no telefone; sem nenhum dos dois não vira cliente', () => {
  assert.equal(customerKey({ customerEmail: null, customerPhone: '(11) 98888-7777' }), 'phone:11988887777');
  assert.equal(customerKey({ customerEmail: null, customerPhone: '123' }), null);
  const list = aggregateCustomers([{ ...base, externalId: '9', customerEmail: null, customerPhone: null, status: 'approved', value: 10, createdAt: 1 }]);
  assert.equal(list.length, 0);
});

test('ordena por receita, depois pela última compra', () => {
  const list = aggregateCustomers([
    { ...base, externalId: 'a', customerEmail: 'a@x.com', status: 'approved', value: 10, createdAt: 5 },
    { ...base, externalId: 'b', customerEmail: 'b@x.com', status: 'approved', value: 90, createdAt: 1 },
  ]);
  assert.deepEqual(list.map((c) => c.email), ['b@x.com', 'a@x.com']);
});
