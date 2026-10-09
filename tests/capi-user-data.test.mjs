import test from "node:test";
import assert from "node:assert/strict";
import { normalizePhone, purchaseUserData } from "../lib/capi-user-data.ts";

test("telefone brasileiro ganha o 55", () => {
  assert.equal(normalizePhone("(11) 98888-7777"), "5511988887777");
  assert.equal(normalizePhone("+55 11 98888-7777"), "5511988887777");
  assert.equal(normalizePhone("1133334444"), "551133334444");
  assert.equal(normalizePhone(""), "");
});

test("user_data usa a visita real e faz hash dos dados pessoais", async () => {
  const u = await purchaseUserData({ email: " Ana@Email.com ", phone: "11988887777", name: "Ana Maria Souza", visitorId: "v1", ip: "200.1.2.3", ua: "Mozilla/5.0", fbc: "fb.1.1.x", fallbackUa: "gateway-bot" });
  assert.equal(u.client_ip_address, "200.1.2.3");
  assert.equal(u.client_user_agent, "Mozilla/5.0");
  assert.match(u.em, /^[0-9a-f]{64}$/);
  assert.match(u.fn, /^[0-9a-f]{64}$/);
  assert.match(u.ln, /^[0-9a-f]{64}$/);
  assert.match(u.external_id, /^[0-9a-f]{64}$/);
  assert.equal(u.fbc, "fb.1.1.x");
  assert.equal(u.fbp, undefined);
  const fallback = await purchaseUserData({ email: "nao-e-email" });
  assert.equal(fallback.em, undefined);
  assert.equal(fallback.client_ip_address, undefined);
});
