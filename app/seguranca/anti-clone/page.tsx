import { AppShell } from "@/components/AppShell";
import { getProjectIds, getWorkspace } from "@/lib/analytics";

export const dynamic = "force-dynamic";

function snippetFor(domain: string, publicKey: string) {
  return `<!-- Anti-Clone GhostScale: bloqueia iframe + reporta domínio não autorizado -->
<script>
(function(){var allowed=${JSON.stringify([domain])},key=${JSON.stringify(publicKey)};
function report(msg){try{var base="";var t=document.querySelector('script[src*="tracker.js"]');if(t&&t.src){try{base=new URL(t.src).origin;}catch(e){}}var p={projectKey:key,eventName:"PageError",eventId:(crypto.randomUUID?crypto.randomUUID():"clone-"+Date.now()),eventTime:Math.floor(Date.now()/1000),url:location.href,message:String(msg).slice(0,160)};var b=new Blob([JSON.stringify(p)],{type:"application/json"});if(navigator.sendBeacon)navigator.sendBeacon(base+"/api/events",b);}catch(e){}}
if(window.top!==window.self){report("[Clone] iframe bloqueado em "+location.hostname);document.body.innerHTML="<h1>Bloqueado</h1>";return;}
if(allowed.length&&allowed[0]&&location.hostname.indexOf(allowed[0])===-1){report("[Clone] dominio nao autorizado: "+location.hostname);console.warn("[TrackBase] Dominio nao autorizado:",location.hostname);}})();
</script>`;
}

export default async function Page() {
  const { workspaceId } = await getWorkspace();
  const { rows } = await getProjectIds(workspaceId);
  return (
    <AppShell title="Anti-Clone" subtitle="Proteja a página de vendas contra cópia em iframe e domínios clonados — com alerta no painel.">
      <div className="grid gap-4">
        <div className="metric-card rounded-xl p-5">
          <b>Como funciona (proteção legítima, sem cloaker blackhat)</b>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
            <li>Bloqueia abertura dentro de <code>iframe</code> (espiões e copiadores).</li>
            <li>Reporta como <code>PageError [Clone]</code> quando o <code>hostname</code> não é o domínio do projeto — aparece em Eventos e Tráfego Inválido.</li>
            <li>Bots com user-agent conhecido são descartados no servidor e IPs da Blacklist não geram eventos.</li>
            <li>Não mostramos conteúdo falso para revisores de anúncio (cloaker blackhat derruba a conta). Aqui é defesa, não enganação.</li>
          </ul>
        </div>
        {!rows.length ? (
          <div className="metric-card rounded-xl p-8 text-center text-sm text-slate-500">Crie um projeto com domínio para gerar o snippet.</div>
        ) : rows.map((r) => (
          <div key={r.id} className="metric-card rounded-xl p-5">
            <b>{r.name}</b>
            <p className="mt-1 text-sm text-slate-500">Domínio: {r.domain || "não definido — edite o projeto"} · Cole logo após a abertura do &lt;head&gt;.</p>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-black/40 p-4 text-xs leading-6 text-sky-300">{snippetFor(r.domain || "", r.publicKey || "")}</pre>
          </div>
        ))}
        <div className="metric-card rounded-xl p-5">
          <div className="flex gap-2">
            <a href="/projetos/novo" className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5">Gerenciar domínios</a>
            <a href="/seguranca/blacklist" className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5">Blacklist de IP →</a>
            <a href="/eventos" className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5">Ver tentativas em Eventos →</a>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
