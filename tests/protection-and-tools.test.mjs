import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { defaultProtection, validateProtection, normalizeDomain, evaluateProtection, protectionScript } from "../lib/protection.ts";
import { normalizeIp } from "../lib/protection-ip.ts";
import { trackerScript } from "../lib/tracker-script.ts";
import { parseTrackingConfig } from "../lib/tracking-config.ts";
import { parsePrice, TOOL_SCHEMAS } from "../lib/tool-state.ts";

test("domínios: host exato, www, subdomínios opcionais e sufixos maliciosos", () => {
  const c = { ...defaultProtection("https://minhaoferta.com.br/produto"), enabled: true, mode: "block" };
  assert.equal(normalizeDomain("HTTPS://MINHAOFERTA.com.br/"), "minhaoferta.com.br");
  assert.equal(evaluateProtection(c, "minhaoferta.com.br").blocked, false);
  assert.equal(evaluateProtection(c, "www.minhaoferta.com.br").blocked, true);
  for (const host of ["minhaoferta.com.br.atacante.com", "falsaminhaoferta.com.br"]) assert.equal(evaluateProtection(c, host).blocked, true);
  assert.equal(evaluateProtection({ ...c, includeSubdomains: true }, "www.minhaoferta.com.br").blocked, false);
  assert.equal(evaluateProtection({ ...c, includeSubdomains: true }, "minhaoferta.com.br.atacante.com").blocked, true);
  assert.throws(() => validateProtection({ ...c, allowedDomains: [] }));
  for (const host of ["javascript:alert(1)", "https://user:pass@site.com", "*.site.com", "site.com\\evil"]) assert.throws(() => normalizeDomain(host));
});

test("observar nunca bloqueia; regras de iframe têm comportamento distinto", () => {
  const c = { ...defaultProtection("site.com"), enabled: true, mode: "block" };
  assert.equal(evaluateProtection({ ...c, mode: "monitor" }, "outro.com").blocked, false);
  assert.equal(evaluateProtection(c, "site.com", true, false).blocked, true);
  assert.equal(evaluateProtection(c, "site.com", true, true).blocked, false);
  assert.equal(evaluateProtection({ ...c, framePolicy: "deny" }, "site.com", true, true).blocked, true);
  assert.equal(evaluateProtection({ ...c, framePolicy: "allow" }, "site.com", true, false).blocked, false);
});

test("IPs: normalização de IPv6, IPv4 mapeado e rejeição de entradas inválidas", () => {
  assert.equal(normalizeIp("2001:0db8:0:0:0:0:0:1"), "2001:db8::1");
  assert.equal(normalizeIp("::ffff:192.0.2.1"), "192.0.2.1");
  for (const v of ["999.1.1.1", "::::", "192.0.2.1/24", "127.000.0.1", "fe80::1%eth0"]) assert.throws(() => normalizeIp(v));
});

function browser(url = "https://site.com/", frame = "direct", readyState = "complete") {
  const listeners = {}, requests = [], fbq = [], nodes = [], storage = new Map();
  const location = new URL(url);
  const node = tag => ({ tagName: tag.toUpperCase(), style: {}, children: [], textContent: "", setAttribute() {}, appendChild(child) { this.children.push(child); }, replaceChildren(...children) { this.children = children; }, querySelectorAll() { return []; } });
  const document = { cookie: "", title: "Página teste", referrer: "", readyState, body: node("body"), head: node("head"), documentElement: node("html"), querySelectorAll: () => [], addEventListener: (type, fn) => { (listeners[type] ||= []).push(fn); }, createElement: tag => { const n = node(tag); nodes.push(n); return n; } };
  const context = { location, document, console, URL, URLSearchParams, Blob, crypto, Date, Math, Object, JSON, Number, String, Array, Boolean, Promise, navigator: { sendBeacon: () => false }, localStorage: { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v) }, sessionStorage: { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v) }, fetch: (url, init) => { requests.push({ url, ...init }); return Promise.resolve({ ok: true }); }, MutationObserver: class { observe() {} }, addEventListener: () => {}, history: { pushState() {}, replaceState() {} }, queueMicrotask: fn => fn(), setTimeout: () => 1 };
  context.window = context; context.self = context;
  context.top = frame === "direct" ? context : frame === "same" ? { location } : { get location() { throw new Error("cross origin"); } };
  context.fbq = (...args) => fbq.push(args); context.__tbPixelId = "123";
  return { context: vm.createContext(context), document, listeners, requests, fbq, nodes };
}

test("script externo funciona no head, usa mensagem como texto e alternativa ao Beacon", () => {
  const c = { ...defaultProtection("site.com"), enabled: true, mode: "block", message: "<img src=x onerror=alert(1)>" };
  const b = browser("https://copie.com/", "direct", "loading");
  vm.runInContext(protectionScript(c, "key1", "https://app.com/api/events"), b.context);
  assert.equal(b.context.__gsProtectionResult.blocked, true);
  assert.equal(b.document.documentElement.style.visibility, "hidden");
  b.listeners.DOMContentLoaded[0]();
  assert.equal(b.document.body.children[0].children[1].textContent, c.message);
  assert.equal(b.document.documentElement.style.visibility, "visible");
  assert.equal(b.requests.length, 1);
  assert.equal(JSON.parse(b.requests[0].body).eventName, "SecurityViolation");
  vm.runInContext(protectionScript(c, "key1", "https://app.com/api/events"), b.context);
  assert.equal(b.requests.length, 1);
});

test("script e simulador concordam para domínio e iframe", () => {
  for (const mode of ["monitor", "block"]) for (const framePolicy of ["allow", "deny", "same-origin"]) for (const frame of ["direct", "same", "other"]) for (const host of ["site.com", "www.site.com", "fauxsite.com"]) {
    const c = { ...defaultProtection("site.com"), enabled: true, mode, framePolicy, includeSubdomains: true };
    const b = browser("https://" + host + "/", frame);
    vm.runInContext(protectionScript(c, "key1", "https://app.com/api/events"), b.context);
    const expected = evaluateProtection(c, host, frame !== "direct", frame === "same");
    assert.equal(b.context.__gsProtectionResult.blocked, expected.blocked);
    assert.equal(b.context.__gsProtectionResult.reason, expected.reason);
  }
});

test("tracker: instalação duplicada, IC, alternativa de rede e Purchase bloqueado no navegador", () => {
  const b = browser("https://site.com/obrigado?fbclid=abc&value=99");
  const c = parseTrackingConfig({ purchase: { mode: "thank_you", thankYouMatch: "/obrigado" } });
  assert.equal(c.purchase.mode, "gateway_approved");
  const script = trackerScript("project1", "https://app.com/api/events", "123", c);
  vm.runInContext(script, b.context);
  assert.ok(b.context.TrackBase, "Tracker inicializa sem erro silencioso");
  const initial = b.requests.length;
  vm.runInContext(script, b.context);
  assert.equal(b.requests.length, initial);
  b.context.TrackBase.initiateCheckout({ value: 99 });
  assert.equal(JSON.parse(b.requests.at(-1).body).eventName, "InitiateCheckout");
  const beforePurchase = b.requests.length;
  b.context.TrackBase.track("Purchase", { value: 99 }); b.context.TrackBase.purchase({ value: 99 });
  assert.equal(b.requests.length, beforePurchase);
  assert.ok(!b.fbq.some(args => args[1] === "Purchase"));
  assert.equal(b.requests[0].keepalive, true);
});

test("proteção interrompe tracker antes de Pixel e PageView em domínio copiado", () => {
  const b = browser("https://clone.com/");
  const c = { ...defaultProtection("site.com"), enabled: true, mode: "block" };
  vm.runInContext(protectionScript(c, "key1", "https://app.com/api/events") + trackerScript("key1", "https://app.com/api/events", "123", parseTrackingConfig(null)), b.context);
  assert.equal(b.requests.length, 1); assert.equal(b.context.TrackBase, undefined); assert.equal(b.fbq.length, 0);
});

test("ferramentas: preços BR/decimal, URLs inseguras, limites e campos validados", () => {
  assert.equal(parsePrice("19,90"), 19.9); assert.equal(parsePrice("19.90"), 19.9); assert.equal(parsePrice("1.299,90"), 1299.9);
  assert.ok(Number.isNaN(parsePrice("19.9.0")));
  assert.equal(TOOL_SCHEMAS.mapa_links.safeParse([{ id: "1", label: "x", url: "javascript:alert(1)" }]).success, false);
  assert.equal(TOOL_SCHEMAS.mapa_links.safeParse([{ id: "1", label: "x", url: "https://user:pass@site.com" }]).success, false);
  assert.equal(TOOL_SCHEMAS.checklist.safeParse({ item: true }).success, true);
  assert.equal(TOOL_SCHEMAS.offer_lab.safeParse([{ id: "1", name: "x", price: Infinity, hook: "", status: "em teste" }]).success, false);
});
