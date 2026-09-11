import { AppShell } from "@/components/AppShell";
import { getEvents, getProjectIds, getWorkspace, pct } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { workspaceId } = await getWorkspace();
  const { rows, ids } = await getProjectIds(workspaceId);
  let list: Awaited<ReturnType<typeof getEvents>> = [];
  let loadError = "";
  try {
    list = await getEvents(ids, Math.floor(Date.now() / 1000) - 30 * 86400);
  } catch {
    loadError = "Não foi possível carregar os eventos. Tente de novo em instantes.";
  }
  let ad = 0, pv = 0, err = 0;
  const perVisitor = new Map<string, number>();
  for (const e of list) {
    if (e.eventName === "AdClick") ad += 1;
    else if (e.eventName === "PageView") pv += 1;
    else if (e.eventName === "PageError") err += 1;
    const v = (e.visitorId || "").trim();
    if (v) perVisitor.set(v, (perVisitor.get(v) ?? 0) + 1);
  }
  let dupVisitors = 0;
  for (const n of perVisitor.values()) if (n > 30) dupVisitors += 1;
  const stats = { ad, pv, err, dupVisitors };
  const lost = Math.max(0, stats.ad - stats.pv);
  return (
    <AppShell title="Tráfego Inválido" subtitle="Detecte bots, cliques perdidos e erros que drenam orçamento.">
      {loadError ? <div role="alert" className="metric-card rounded-xl border-red-400/30 p-8 text-center text-sm text-red-600 dark:text-red-300">{loadError}</div> : (!rows.length || !list.length) ? <div className="metric-card rounded-xl p-8 text-center text-slate-400">Sem eventos no período. Instale o tracker para começar a análise.</div> : (
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Cliques sem PageView", String(lost), `${pct(lost, stats.ad)}% dos cliques`],
              ["PageErrors", String(stats.err), "Falhas de carregamento"],
              ["Visitantes hiperativos", String(stats.dupVisitors), ">30 eventos em 30d (possível bot)"],
              ["Saúde do tráfego", lost > 0 && pct(lost, stats.ad) > 30 ? "Crítica" : "OK", "Meta: perda < 20%"],
            ].map(([k, v, s]) => (
              <div key={k} className="metric-card rounded-xl p-5"><p className="text-sm text-slate-400">{k}</p><p className="mt-2 text-2xl font-semibold">{v}</p><p className="mt-1 text-xs text-slate-500">{s}</p></div>
            ))}
          </div>
          <div className="metric-card rounded-xl p-5 text-sm leading-6 text-slate-300">
            <b>Plano de ação</b>
            <ul className="mt-2 list-disc pl-5">
              <li>Perda alta? Confira velocidade mobile, bloqueios de cookie e redirecionamentos.</li>
              <li>Erros altos? Veja <a href="/eventos" className="text-violet-300 underline">Eventos → PageError</a> e corrija scripts.</li>
              <li>Bots? Adicione os IPs em <a href="/seguranca/blacklist" className="text-violet-300 underline">Blacklist</a> e ative o <a href="/seguranca/anti-clone" className="text-violet-300 underline">Anti-Clone</a>.</li>
            </ul>
          </div>
        </div>
      )}
    </AppShell>
  );
}
