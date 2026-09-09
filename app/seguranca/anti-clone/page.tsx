import { AppShell } from "@/components/AppShell";
import { getProjectIds, getWorkspace } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { workspaceId } = await getWorkspace();
  const { rows } = await getProjectIds(workspaceId);
  const snippet = `<!-- Anti-Clone TrackBase: bloqueia iframe + domínio não autorizado -->
<script>
(function(){var allowed=${JSON.stringify(rows.map((r) => r.domain).filter(Boolean))};
if(window.top!==window.self){document.body.innerHTML="<h1>Bloqueado</h1>";return;}
if(allowed.length&&!allowed.some(function(d){return location.hostname.indexOf(d)>-1})){console.warn("[TrackBase] Domínio não autorizado:",location.hostname);}})();
</script>`;
  return (
    <AppShell title="Anti-Clone" subtitle="Proteja a página de vendas contra cópia em iframe e domínios clonados.">
      <div className="grid gap-4">
        <div className="metric-card rounded-xl p-5">
          <b>Como funciona</b>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
            <li>Bloqueia abertura dentro de <code>iframe</code> (cloakers e espiões).</li>
            <li>Alerta quando o <code>hostname</code> não é o domínio do projeto ({rows.length} projeto(s) no workspace).</li>
            <li>Combine com o tracker: clones sem a sua <code>publicKey</code> não geram Purchase deduplicado.</li>
          </ul>
        </div>
        <div className="metric-card rounded-xl p-5">
          <b>Snippet para a página</b>
          <p className="mt-1 text-sm text-slate-500">Cole logo após a abertura do &lt;head&gt;.</p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-black/40 p-4 text-xs leading-6 text-sky-300">{snippet}</pre>
          <div className="mt-3 flex gap-2">
            <a href="/projetos/novo" className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5">Gerenciar domínios</a>
            <a href="/seguranca/blacklist" className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5">Blacklist de IP →</a>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
