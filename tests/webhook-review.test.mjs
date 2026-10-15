import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const root = new URL('../', import.meta.url).pathname;
const { outputFiles } = await build({
  entryPoints: [root + 'lib/webhook-review.ts'], bundle: true, write: false, format: 'esm', platform: 'node', target: 'node20',
  plugins: [{ name: 'aliases', setup(b) {
    b.onResolve({ filter: /^@\/lib\/sale-ingest$/ }, () => ({ path: root + 'lib/sale-ingest.ts' }));
  } }],
});
const mod = await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'));

test('lê valor em formato brasileiro, inglês e número', () => {
  assert.deepEqual(mod.readAmount('R$ 1.234,56'), { value: 1234.56, source: 'explicit' });
  assert.deepEqual(mod.readAmount('97.5'), { value: 97.5, source: 'explicit' });
  assert.deepEqual(mod.readAmount(47), { value: 47, source: 'explicit' });
});

test('valor ausente e ilegível são marcados, não viram zero em silêncio', () => {
  assert.equal(mod.readAmount(undefined).source, 'missing');
  assert.equal(mod.readAmount('').source, 'missing');
  assert.equal(mod.readAmount('abc').source, 'invalid');
  assert.equal(mod.readAmount(-5).source, 'invalid');
  assert.equal(mod.readAmount({ x: 1 }).source, 'invalid');
});

test('monta a nota de revisão só quando algo está faltando', () => {
  const ok = { value: 10, source: 'explicit' };
  assert.equal(mod.reviewNote({ idFromProvider: true, knownStatus: true, amount: ok }), null);
  const note = mod.reviewNote({ idFromProvider: false, knownStatus: false, amount: { value: 0, source: 'missing' } });
  assert.match(note, /ID do pedido/);
  assert.match(note, /status desconhecido/);
  assert.match(note, /valor não veio/);
});
