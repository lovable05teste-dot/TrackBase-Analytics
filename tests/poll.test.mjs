import { test, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const root = new URL('../', import.meta.url).pathname;
const { outputFiles } = await build({ entryPoints: [root + 'lib/poll.ts'], bundle: true, write: false, format: 'esm', platform: 'node', target: 'node20' });
const { startPolling } = await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'));

let listeners;
beforeEach(() => {
  listeners = [];
  globalThis.document = { hidden: false, addEventListener: (_, fn) => listeners.push(fn), removeEventListener: () => {} };
  mock.timers.enable({ apis: ['setTimeout'] });
});
afterEach(() => { mock.timers.reset(); delete globalThis.document; });

const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

test('consulta a cada intervalo quando tudo dá certo', async () => {
  let calls = 0;
  const stop = startPolling(async () => { calls++; return 'ok'; }, { intervalMs: 1000, immediate: true });
  await flush();
  assert.equal(calls, 1);
  mock.timers.tick(999); await flush(); assert.equal(calls, 1);
  mock.timers.tick(1); await flush(); assert.equal(calls, 2);
  stop();
});

test('recua de forma exponencial quando falha, com teto', async () => {
  const at = [];
  let now = 0;
  const stop = startPolling(async () => { at.push(now); return 'error'; }, { intervalMs: 1000, maxBackoffMs: 4000, immediate: true });
  await flush();
  while (at.length < 5) { now++; mock.timers.tick(1); await flush(); }
  const gaps = at.slice(1).map((t, i) => t - at[i]);
  assert.deepEqual(gaps, [2000, 4000, 4000, 4000]);
  stop();
});

test('não consulta com a aba oculta e retoma ao voltar', async () => {
  let calls = 0;
  globalThis.document.hidden = true;
  const stop = startPolling(async () => { calls++; return 'ok'; }, { intervalMs: 1000 });
  mock.timers.tick(5000); await flush();
  assert.equal(calls, 0);
  globalThis.document.hidden = false;
  listeners.forEach((fn) => fn());
  await flush();
  assert.equal(calls, 1);
  stop();
});

test('stop encerra e o cleanup remove os timers', async () => {
  let calls = 0;
  const stop = startPolling(async () => { calls++; return calls === 2 ? 'stop' : 'ok'; }, { intervalMs: 1000, immediate: true });
  await flush();
  mock.timers.tick(1000); await flush();
  assert.equal(calls, 2);
  mock.timers.tick(10000); await flush();
  assert.equal(calls, 2);
  stop();
});
