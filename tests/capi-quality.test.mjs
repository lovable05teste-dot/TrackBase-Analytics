import test from "node:test";
import assert from "node:assert/strict";
import { capiQuality } from "../lib/capi-quality.ts";

test("capi quality counts identifiers and scores", () => {
  const q = capiQuality([
    { fbc: "fb.1.1.abc", fbp: "fb.1.2", payload: JSON.stringify({ customer: { email: "a@b.com", phone: "(11) 98888-7777" } }) },
    { fbc: null, fbp: null, payload: JSON.stringify({ customer: { email: "", phone: "123" } }) },
  ]);
  assert.equal(q.total, 2);
  assert.deepEqual([q.email, q.phone, q.fbc, q.fbp], [1, 1, 1, 1]);
  assert.equal(q.score, 5);
  assert.equal(q.label, "Regular");
  assert.ok(q.tips.length >= 1);
});

test("capi quality with no purchases", () => {
  const q = capiQuality([]);
  assert.equal(q.label, "Sem compras");
  assert.equal(q.score, 0);
});
