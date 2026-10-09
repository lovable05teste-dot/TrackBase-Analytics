import test from "node:test";
import assert from "node:assert/strict";
import { buildUtmIndex, parseUtm } from "../lib/utm-match.ts";

test("parseUtm separa nome e ID e ignora macros", () => {
  assert.deepEqual(parseUtm("Produto X|120211234567890"), { id: "120211234567890", name: "produto x" });
  assert.deepEqual(parseUtm(" Produto X "), { id: null, name: "produto x" });
  assert.deepEqual(parseUtm("{{campaign.name}}|{{campaign.id}}"), { id: null, name: null });
  assert.deepEqual(parseUtm(""), { id: null, name: null });
});

test("campanha não pega eventos de outra com nome parecido", () => {
  const events = [
    { e: "IC", utm: "Produto X 2|222222222" },
    { e: "IC", utm: "Produto X - Teste" },
    { e: "IC", utm: "Produto X|111111111" },
    { e: "PV", utm: "produto x" },
  ];
  const index = buildUtmIndex(events, (ev) => [ev.utm]);
  assert.deepEqual(index.match({ id: "111111111", name: "Produto X" }).map((ev) => ev.utm), ["Produto X|111111111", "produto x"]);
  assert.equal(index.match({ id: "999999999", name: "Campanha que nunca rodou" }).length, 0);
  assert.equal(index.match({ id: "333333333", name: "Produto" }).length, 0, "nome parcial não casa");
});

test("ID no UTM manda: nome igual com ID diferente não casa", () => {
  const index = buildUtmIndex([{ utm: "Produto X|222222222" }], (ev) => [ev.utm]);
  assert.equal(index.match({ id: "111111111", name: "Produto X" }).length, 0);
});

test("conjunto casa por utm_term ou utm_medium sem contar duas vezes", () => {
  const ev = { term: "Conjunto A|444444444", medium: "Conjunto A|444444444" };
  const index = buildUtmIndex([ev], (e) => [e.term, e.medium]);
  assert.equal(index.match({ id: "444444444", name: "Conjunto A" }).length, 1);
});
