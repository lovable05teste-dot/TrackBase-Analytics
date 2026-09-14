import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { defaultProtection } from "../lib/protection.ts";

// Fixtures locais: SQL real em SQLite; somente sessão e conexão são substituídas.
const require = createRequire(import.meta.url);
const sha = value => createHash("sha256").update(value).digest("hex");
const ws = user => "ws_" + sha(user).slice(0, 24);
const authModule = `
export async function requestUserId(request) { return request.headers.get('x-test-user'); }
export async function sha256(value) { const a=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(a)).map(x=>x.toString(16).padStart(2,'0')).join(''); }
export function hasConflictingOrigin(request) { const origin=request.headers.get('origin');return !!origin&&origin!==new URL(request.url).origin; }
export async function decryptSecret() { throw new Error('External CAPI disabled in tests'); }
`;
const plugins = [{ name: "test-fixtures", setup(b) {
  b.onResolve({ filter: /(?:^@\/db$|\/\.\.\/\.\.\/db$)/ }, () => ({ path: "db", namespace: "fixture" }));
  b.onResolve({ filter: /trackbase-security$/ }, () => ({ path: "auth", namespace: "fixture" }));
  b.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path === "auth" ? authModule : "export function getDb(){ if(globalThis.__gsDbError)throw Error('offline');return globalThis.__gsDb;} export async function ensureDb(){if(globalThis.__gsDbError)throw Error('offline');}" }));
} }];
async function load(path) {
  const result = await build({ entryPoints: [path], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins, logLevel: "silent" });
  const m = { exports: {} }; new Function("require", "module", "exports", result.outputFiles[0].text)(require, m, m.exports); return m.exports;
}
const protection = await load("app/api/projects/protection/route.ts");
const state = await load("app/api/tools/state/route.ts");
const eventRoute = await load("app/api/events/route.ts");
const scriptRoute = await load("app/protection.js/route.ts");
const permissions = await load("lib/permissions.ts");
let sqlite;
beforeEach(() => {
  sqlite?.close(); sqlite = new DatabaseSync(":memory:");
  const source = readFileSync("db/index.ts", "utf8");
  const statements = new Function("return " + source.match(/const statements=(\[[\s\S]*?\]);/)[1])();
  for (const statement of statements) sqlite.exec(statement);
  globalThis.__gsDbError = false;
  globalThis.__gsDb = drizzle(async (sql, params, method) => {
    const statement = sqlite.prepare(sql);
    if (method === "run") { statement.run(...params); return { rows: [] }; }
    statement.setReturnArrays(true);
    return { rows: method === "get" ? statement.get(...params) : statement.all(...params) };
  });
  for (const user of ["a", "b"]) sqlite.prepare("INSERT INTO projects(id,workspace_id,name,domain,public_key,created_at) VALUES(?,?,?,?,?,?)").run("p" + user, ws(user), "Projeto " + user, "site.com", "key-" + user, "2026-01-01");
});
function paid(user = "a", plan = "start", expired = false) {
  const now = Math.floor(Date.now() / 1000);
  sqlite.prepare("DELETE FROM plan_subscriptions WHERE user_id=?").run(user);
  sqlite.prepare("INSERT INTO plan_subscriptions(id,workspace_id,user_id,plan,plan_version,status,current_period_end,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)").run("sub-" + user, ws(user), user, plan, 2, "active", now + (expired ? -10 : 86400), now, now);
}
function request(path, user = "a", method = "GET", body, origin = "https://app.com") {
  return new Request("https://app.com" + path, { method, headers: { ...(user ? { "x-test-user": user } : {}), "content-type": "application/json", origin }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
const config = () => ({ ...defaultProtection("site.com"), enabled: true, mode: "block" });

test("proteção: sem sessão 401; projeto alheio 404; sem plano 402", async () => {
  assert.equal((await protection.GET(request("/api/projects/protection?projectId=pa", null))).status, 401);
  assert.equal((await protection.GET(request("/api/projects/protection?projectId=pa", "b"))).status, 404);
  assert.equal((await protection.PUT(request("/api/projects/protection?projectId=pa", "a", "PUT", { revision: 0, config: config() }))).status, 402);
});

test("Start salva Anti-Clone; edição concorrente não sobrescreve a versão salva", async () => {
  paid();
  const path = "/api/projects/protection?projectId=pa";
  const first = await protection.PUT(request(path, "a", "PUT", { revision: 0, config: config() }));
  assert.equal(first.status, 200); assert.equal((await first.json()).revision, 1);
  assert.equal((await protection.PUT(request(path, "a", "PUT", { revision: 0, config: { ...config(), enabled: false } }))).status, 409);
  const data = await (await protection.GET(request(path))).json();
  assert.equal(data.config.enabled, true); assert.equal(data.revision, 1);
  assert.equal((await protection.PUT(request(path, "b", "PUT", { revision: 1, config: config() }))).status, 404);
  assert.equal((await protection.PUT(request(path, "a", "PUT", { revision: 1, config: config() }, "https://outro.com"))).status, 403);
});

test("blacklist: plano, validação, persistência e remoção", async () => {
  paid(); const path = "/api/projects/protection?projectId=pa";
  assert.equal((await protection.PATCH(request(path, "a", "PATCH", { revision: 0, action: "add", ip: "192.0.2.1" }))).status, 402);
  paid("a", "pro");
  assert.equal((await protection.PATCH(request(path, "a", "PATCH", { revision: 0, action: "add", ip: "::::" }))).status, 400);
  assert.equal((await protection.PATCH(request(path, "a", "PATCH", { revision: 0, action: "add", ip: "192.0.2.1" }))).status, 200);
  assert.deepEqual((await (await protection.GET(request(path))).json()).blockedIps, ["192.0.2.1"]);
  const response = await protection.PATCH(request(path, "a", "PATCH", { revision: 1, action: "remove", ip: "192.0.2.1" }));
  assert.equal(response.status, 200); assert.deepEqual((await response.json()).blockedIps, []);
});

test("ingestão bloqueia domínio copiado, separa diagnósticos e preserva métricas", async () => {
  paid("a", "pro");
  const path = "/api/projects/protection?projectId=pa";
  await protection.PUT(request(path, "a", "PUT", { revision: 0, config: config() }));
  const event = { projectKey: "key-a", eventName: "PageView", url: "https://copie.com/" };
  assert.equal((await eventRoute.POST(request("/api/events", null, "POST", event, "https://copie.com"))).status, 403);
  event.url = "https://site.com/";
  assert.equal((await eventRoute.POST(request("/api/events", null, "POST", event, "https://site.com"))).status, 200);
  const report = { ...event, eventName: "SecurityCheck", reason: "allowed" };
  for (let n = 0; n < 2; n++) assert.equal((await eventRoute.POST(request("/api/events", null, "POST", report, "https://site.com"))).status, 200);
  assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM protection_reports").get().n, 1);
  assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM events").get().n, 1);
  assert.equal((await eventRoute.POST(request("/api/events", null, "POST", { ...event, eventName: "Purchase" }))).status, 400);
});

test("IP excluído não entra nas métricas e não aparece no script público", async () => {
  paid("a", "pro"); const path = "/api/projects/protection?projectId=pa";
  await protection.PATCH(request(path, "a", "PATCH", { revision: 0, action: "add", ip: "192.0.2.1" }));
  const req = request("/api/events", null, "POST", { projectKey: "key-a", eventName: "PageView", url: "https://site.com/" }, "https://site.com");
  req.headers.set(process.env.VERCEL ? "x-vercel-forwarded-for" : "cf-connecting-ip", "192.0.2.1");
  const response = await eventRoute.POST(req);
  assert.equal((await response.json()).ignored, true);
  assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM events").get().n, 0);
  const script = await scriptRoute.GET(request("/protection.js?key=key-a", null));
  assert.equal(script.status, 200); assert.ok(!(await script.text()).includes("192.0.2.1"));
});

test("ferramentas: dados isolados por conta e controle de versão", async () => {
  paid("a", "start"); paid("b", "start"); const path = "/api/tools/state?tool=checklist";
  assert.equal((await state.PUT(request(path, "a", "PUT", { revision: 0, data: { revisado: true } }))).status, 200);
  assert.deepEqual((await (await state.GET(request(path, "a"))).json()).data, { revisado: true });
  assert.deepEqual((await (await state.GET(request(path, "b"))).json()).data, {});
  assert.equal((await state.PUT(request(path, "a", "PUT", { revision: 0, data: {} }))).status, 409);
  assert.equal((await state.GET(request(path, null))).status, 401);
  assert.equal((await state.PUT(request("/api/tools/state?tool=monitoramento", "a", "PUT", { revision: 0, data: [] }))).status, 402);
});

test("falha do banco, ausência de sessão ou ciclo expirado nunca liberam plano", async () => {
  assert.equal((await permissions.getPlanContext(null)).hasActive, false);
  paid("a", "pro", true); assert.equal((await permissions.getPlanContext("a")).hasActive, false);
  globalThis.__gsDbError = true; assert.equal((await permissions.getPlanContext("a")).hasActive, false);
});
