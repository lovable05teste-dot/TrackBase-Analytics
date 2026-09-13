import { test } from "node:test";
import assert from "node:assert/strict";
import { metaRedirectUri, metaPages } from "../lib/meta.ts";

test("callback is canonical and configuration is validated", () => {
  const old = {...process.env};
  try {
    delete process.env.META_REDIRECT_URI;
    delete process.env.APP_URL;
    assert.equal(metaRedirectUri(), "https://www.ghostscale.com.br/api/meta/oauth/callback");
    process.env.APP_URL = "https://example.com";
    assert.equal(metaRedirectUri(), "https://example.com/api/meta/oauth/callback");
    process.env.META_REDIRECT_URI = "https://other.example/api/meta/oauth/callback";
    assert.equal(metaRedirectUri(), process.env.META_REDIRECT_URI);
    for (const url of ["http://example.com/api/meta/oauth/callback", "https://example.com/wrong", "https://example.com/api/meta/oauth/callback?secret=x", "https://user:pass@example.com/api/meta/oauth/callback"]) {
      process.env.META_REDIRECT_URI = url;
      assert.throws(() => metaRedirectUri());
    }
  } finally { for (const key of ["APP_URL","META_REDIRECT_URI"]) { if (old[key] === undefined) delete process.env[key]; else process.env[key]=old[key]; } }
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
