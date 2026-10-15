import { test } from "node:test";
import assert from "node:assert/strict";
import { metaAuthorizationUrl, metaConfig, metaRedirectUri, metaPages, requireMetaConfig } from "../lib/meta.ts";

test("callback is always canonical and cannot be changed by environment or Host", () => {
  const old = {...process.env};
  try {
    delete process.env.META_REDIRECT_URI;
    delete process.env.APP_URL;
    assert.equal(metaRedirectUri(), "https://www.ghostscale.com.br/api/meta/oauth/callback");
    process.env.APP_URL = "https://example.com";
    assert.equal(metaRedirectUri(), "https://www.ghostscale.com.br/api/meta/oauth/callback");
    process.env.META_REDIRECT_URI = "https://other.example/api/meta/oauth/callback";
    assert.equal(metaRedirectUri(), "https://www.ghostscale.com.br/api/meta/oauth/callback");
    for (const url of ["http://example.com/api/meta/oauth/callback", "https://example.com/wrong", "https://example.com/api/meta/oauth/callback?secret=x", "https://user:pass@example.com/api/meta/oauth/callback"]) {
      process.env.META_REDIRECT_URI = url;
      assert.equal(metaRedirectUri(), "https://www.ghostscale.com.br/api/meta/oauth/callback");
    }
  } finally { for (const key of ["APP_URL","META_REDIRECT_URI"]) { if (old[key] === undefined) delete process.env[key]; else process.env[key]=old[key]; } }
});

function withMetaEnv(values, run) {
  const keys = ["META_APP_ID", "META_APP_SECRET", "META_LOGIN_CONFIG_ID", "META_GRAPH_VERSION"];
  const old = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    for (const key of keys) {
      if (values[key] === undefined) delete process.env[key];
      else process.env[key] = values[key];
    }
    run();
  } finally {
    for (const key of keys) {
      if (old[key] === undefined) delete process.env[key];
      else process.env[key] = old[key];
    }
  }
}

test("authorization contains the configured App ID and exact shared callback", () => {
  withMetaEnv({ META_APP_ID: " 123456789 ", META_APP_SECRET: "test-secret" }, () => {
    const config = requireMetaConfig();
    const url = metaAuthorizationUrl("test-state", config);
    assert.equal(url.origin, "https://www.facebook.com");
    assert.equal(url.pathname, "/v25.0/dialog/oauth");
    assert.equal(url.searchParams.get("client_id"), "123456789");
    assert.equal(url.searchParams.get("redirect_uri"), "https://www.ghostscale.com.br/api/meta/oauth/callback");
    assert.equal(url.searchParams.get("redirect_uri"), config.redirectUri);
    assert.equal(url.searchParams.get("state"), "test-state");
    assert.equal(url.searchParams.get("response_type"), "code");
    assert.equal(url.searchParams.get("scope"), "ads_read,ads_management,business_management");
    assert.equal(url.searchParams.has("config_id"), false);
    assert.equal(url.searchParams.has("client_secret"), false);
    assert.equal(url.toString().includes("test-secret"), false);
    assert.equal(url.searchParams.getAll("redirect_uri").length, 1);
  });
});

test("authorization preserves optional login config and classic mode", () => {
  withMetaEnv({ META_APP_ID: "123456789", META_APP_SECRET: "test-secret", META_LOGIN_CONFIG_ID: "987654321" }, () => {
    const config = requireMetaConfig();
    assert.equal(metaAuthorizationUrl("test-state", config).searchParams.get("config_id"), "987654321");
    assert.equal(metaAuthorizationUrl("test-state", { ...config, configId: "" }).searchParams.has("config_id"), false);
  });
});

test("missing or empty App ID prevents authorization with META_NOT_CONFIGURED", () => {
  for (const appId of [undefined, "", "   "]) {
    withMetaEnv({ META_APP_ID: appId, META_APP_SECRET: "test-secret" }, () => {
      assert.equal(metaConfig().appId, "");
      assert.throws(() => requireMetaConfig(), /META_NOT_CONFIGURED/);
      assert.throws(() => metaAuthorizationUrl("test-state"), /META_NOT_CONFIGURED/);
      assert.throws(() => metaAuthorizationUrl("test-state", metaConfig()), /META_NOT_CONFIGURED/);
    });
  }
});

test("pagination traverses more than five pages without truncating", async () => {
  const original=globalThis.fetch;
  let calls=0;
  globalThis.fetch=async () => { calls++; return Response.json({data:[calls],paging:calls<7?{next:"https://graph.facebook.com/page/"+calls}:undefined}); };
  try { assert.deepEqual((await metaPages("https://graph.facebook.com/start")).data,[1,2,3,4,5,6,7]); }
  finally { globalThis.fetch=original; }
});

test("pagination refuses untrusted hosts and repeated cursors", async () => {
  const original=globalThis.fetch;
  try {
    await assert.rejects(metaPages("https://attacker.example"),/PAGINATION/);
    globalThis.fetch=async () => Response.json({data:[],paging:{next:"https://graph.facebook.com/start"}});
    await assert.rejects(metaPages("https://graph.facebook.com/start"),/PAGINATION/);
  } finally { globalThis.fetch=original; }
});
