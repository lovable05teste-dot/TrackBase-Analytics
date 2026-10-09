import test from "node:test";
import assert from "node:assert/strict";
import { buildUtmIndex, isAdClick, isMetaTraffic, parseUtm } from "../lib/utm-match.ts";

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
  assert.deepEqual(index.matchAll([{ id: "111111111", name: "Produto X" }]).get("111111111").events.map((ev) => ev.utm), ["Produto X|111111111", "produto x"]);
  assert.equal(index.matchAll([{ id: "999999999", name: "Campanha que nunca rodou" }]).get("999999999").events.length, 0);
  assert.equal(index.matchAll([{ id: "333333333", name: "Produto" }]).get("333333333").events.length, 0, "nome parcial não casa");
});

test("ID no UTM manda: nome igual com ID diferente não casa", () => {
  const index = buildUtmIndex([{ utm: "Produto X|222222222" }], (ev) => [ev.utm]);
  assert.equal(index.matchAll([{ id: "111111111", name: "Produto X" }]).get("111111111").events.length, 0);
});

test("conjunto casa por utm_term ou utm_medium sem contar duas vezes", () => {
  const ev = { term: "Conjunto A|444444444", medium: "Conjunto A|444444444" };
  const index = buildUtmIndex([ev], (e) => [e.term, e.medium]);
  assert.equal(index.matchAll([{ id: "444444444", name: "Conjunto A" }]).get("444444444").events.length, 1);
});

test("nome repetido em várias campanhas: UTM sem ID não é atribuído a nenhuma", () => {
  const index = buildUtmIndex([{ utm: "Produto X" }, { utm: "Produto X" }, { utm: "Produto X|111111111" }], (ev) => [ev.utm]);
  const result = index.matchAll([{ id: "111111111", name: "Produto X" }, { id: "222222222", name: "Produto X" }, { id: "333333333", name: "Produto X" }]);
  assert.equal(result.get("111111111").events.length, 1, "só o evento com o ID dela");
  assert.equal(result.get("222222222").events.length, 0);
  assert.equal(result.get("333333333").events.length, 0, "duplicada que não rodou fica zerada");
});

test("idOnly: evento sem ID do Meta não conta para campanha nenhuma", () => {
  const index = buildUtmIndex([{ utm: "Produto X" }, { utm: "Produto X|111111111" }, { utm: "teste123" }], (ev) => [ev.utm]);
  const result = index.matchAll([{ id: "111111111", name: "Produto X" }, { id: "999999999", name: "teste123" }], { idOnly: true });
  assert.deepEqual(result.get("111111111").events.map((e) => e.utm), ["Produto X|111111111"]);
  assert.equal(result.get("999999999").events.length, 0);
});

test("isMetaTraffic reconhece tráfego do Meta e ignora o resto", () => {
  assert.equal(isMetaTraffic({ fbclid: "abc" }), true);
  assert.equal(isMetaTraffic({ utmSource: "FB" }), true);
  assert.equal(isMetaTraffic({ utmSource: "facebookjLj6ac59377" }), true);
  assert.equal(isMetaTraffic({ utmSource: "ig" }), true);
  assert.equal(isMetaTraffic({ utmCampaign: "Produto|120211234567890" }), true);
  assert.equal(isMetaTraffic({ utmSource: "google", utmCampaign: "brand" }), false);
  assert.equal(isMetaTraffic({ utmSource: "teste", utmCampaign: "teste123" }), false);
  assert.equal(isMetaTraffic({}), false);
});

test("isAdClick só aceita visitas vindas de clique no anúncio", () => {
  assert.equal(isAdClick({ fbclid: "IwAR123" }), true);
  assert.equal(isAdClick({ fbc: "fb.1.1712345678901.IwAR123" }), true);
  assert.equal(isAdClick({ fbclid: "", fbc: "" }), false);
  assert.equal(isAdClick({ fbclid: null, fbc: "lixo" }), false);
  assert.equal(isAdClick({}), false);
});
