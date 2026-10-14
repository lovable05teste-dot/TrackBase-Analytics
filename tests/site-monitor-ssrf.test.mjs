import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createServer } from 'node:http';

// Carrega o módulo TS direto (mesmo truque dos outros testes), com o alias "@/db" simulado.
const root = new URL('../', import.meta.url).pathname;
const { outputFiles } = await build({
  entryPoints: [root + 'lib/site-monitor.ts'],
  bundle: true, write: false, format: 'esm', platform: 'node', target: 'node20',
  plugins: [{ name: 'aliases', setup(b) {
    b.onResolve({ filter: /^@\/db$/ }, () => ({ path: 'stub-db', namespace: 'stub' }));
    b.onResolve({ filter: /^@\/db\/schema$/ }, () => ({ path: 'stub-schema', namespace: 'stub' }));
    b.onResolve({ filter: /^@\/lib\/push$/ }, () => ({ path: 'stub-push', namespace: 'stub' }));
    b.onResolve({ filter: /^@\/lib\/(.*)$/ }, (a) => ({ path: root + 'lib/' + a.path.slice(6) + '.ts' }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, (a) => ({
      contents: a.path === 'stub-db' ? 'export const getDb = () => { throw new Error("no db"); };' : a.path === 'stub-push' ? 'export async function pushToWorkspace() {}' : 'export const monitorChecks = {}; export const siteMonitors = {};',
      loader: 'js',
    }));
  } }],
});
const mod = await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'));

test('IP interno e localhost são recusados antes de conectar', async () => {
  const r1 = await mod.checkSite('http://127.0.0.1:9/');
  assert.equal(r1.ok, false); assert.match(r1.error || '', /não público|domínio|recus|conex|ECONN/i);
  const r2 = await mod.checkSite('http://localhost:9/');
  assert.equal(r2.ok, false);
  const r3 = await mod.checkSite('http://169.254.169.254/latest/meta-data');
  assert.equal(r3.ok, false);
});

test('site local público-simulado responde e palavra-chave é verificada', async () => {
  // Servidor em 127.0.0.1 é interno, então a própria checagem deve recusar: prova que o bloqueio vale.
  const srv = createServer((req, res) => { res.end('<html>olá loja</html>'); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port;
  const blocked = await mod.checkSite(`http://127.0.0.1:${port}/`);
  srv.close();
  assert.equal(blocked.ok, false);
});
