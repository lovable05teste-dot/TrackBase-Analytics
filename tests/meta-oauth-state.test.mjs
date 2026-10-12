import { test } from "node:test";
import assert from "node:assert/strict";
import { metaStateOrigin } from "../lib/meta-oauth-state.ts";

test("OAuth returns to the complete original GhostScale hostname", () => {
  const nonce = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  for (const host of ["ghostscale.com.br", "www.ghostscale.com.br"]) {
    assert.equal(metaStateOrigin(`${nonce}.${host}`), `https://${host}`);
  }
});

test("OAuth state cannot select an external redirect origin", () => {
  for (const value of ["", "nonce", ".ghostscale.com.br", "nonce.br", "nonce.evil.example", "nonce.ghostscale.com.br.evil.example", "nonce.evil.example.ghostscale.com.br", "nonce.ghostscale.com.br/path", "nonce.ghostscale.com.br:443", "nonce.ghostscale.com.br@evil.example"]) {
    assert.equal(metaStateOrigin(value), null, value);
  }
});
