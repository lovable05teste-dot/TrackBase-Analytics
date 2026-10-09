import test from "node:test";
import assert from "node:assert/strict";
import { isPrivateHost, isPrivateIp, nextMonitorState, normalizeMonitorUrl } from "../lib/monitor-core.ts";

test("URL do monitor: completa https e bloqueia endereços internos", () => {
  assert.equal(normalizeMonitorUrl("minhaloja.com.br/oferta"), "https://minhaloja.com.br/oferta");
  for (const bad of ["http://localhost:3000", "http://127.0.0.1", "http://10.0.0.5", "http://192.168.1.1", "http://169.254.169.254/latest", "http://[::1]/", "ftp://site.com", "https://user:pw@site.com"]) {
    assert.throws(() => normalizeMonitorUrl(bad), undefined, bad);
  }
  assert.equal(isPrivateHost("api.internal"), true);
  assert.equal(isPrivateIp("172.20.1.1"), true);
  assert.equal(isPrivateIp("8.8.8.8"), false);
  assert.equal(isPrivateIp("::ffff:10.1.1.1"), true);
  assert.equal(isPrivateIp("2606:4700::1111"), false);
});

test("fora do ar só na 2ª falha seguida, avisa uma vez ao cair e ao voltar", () => {
  const fail = { ok: false, code: 500, ms: 120, error: null };
  const ok = { ok: true, code: 200, ms: 300, error: null };
  let s = { status: "up", failStreak: 0, downSince: null };
  let n = nextMonitorState(s, fail, 100);
  assert.equal(n.status, "up"); assert.equal(n.alert, null); assert.equal(n.failStreak, 1);
  n = nextMonitorState(n, fail, 400);
  assert.equal(n.status, "down"); assert.equal(n.alert, "down"); assert.equal(n.downSince, 400);
  n = nextMonitorState(n, fail, 700);
  assert.equal(n.alert, null); assert.equal(n.downSince, 400);
  n = nextMonitorState(n, ok, 1000);
  assert.equal(n.status, "up"); assert.equal(n.alert, "up"); assert.equal(n.downSince, null);
  n = nextMonitorState({ status: "unknown", failStreak: 0, downSince: null }, ok, 5);
  assert.equal(n.alert, null);
});
