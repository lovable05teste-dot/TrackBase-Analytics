import { AppShell } from "@/components/AppShell";
import { brl, getEventTotals, getOrdersSummary, getProjectIds, getWorkspace, pct } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams?: Promise<{ period?: string }> }) {
  const sp = await searchParams;
  const period = sp?.period === "last_7d" || sp?.period === "all" ? sp.period : "last_30d";
  const since = period === "all" ? null : Math.floor(Date.now() / 1000) - (period === "last_7d" ? 7 : 30) * 86400;
  const { workspaceId } = await getWorkspace();
  const { rows, ids } = await getProjectIds(workspaceId);
  const { byName, revenue } = await getEventTotals(ids, since);
  const orders = await getOrdersSummary(ids, since);
  const nAd = byName.get("AdClick") ?? 0;
  const nPv = byName.get("PageView") ?? 0;
  const nVc = byName.get("ViewContent") ?? 0;
  const nIc = byName.get("InitiateCheckout") ?? 0;
  const nPur = byName.get("Purchase") ?? 0;

  return (
    <AppShell title="Relatórios" subtitle="Consolidado de eventos do tracker + pedidos dos gateways no período.">
      <div className="mb-4 flex gap-2">
        {[["last_7d", "7 dias"], ["last_30d", "30 dias"], ["all", "Tudo"]].map(([p, l]) => (
          <a key={p} href={`/relatorios?period=${p}`} className={`rounded-lg border px-3 py-2 text-sm ${period === p ? "border-violet-400/40 bg-violet-500/15 text-violet-200" : "border-white/10 text-slate-400 hover:bg-white/5"}`}>{l}</a>
        ))}
        <a href="/relatorios/utms" className="ml-auto rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5">Ver por UTM →</a>
      </div>
      {!rows.length ? (
        <div className="metric-card rounded-xl p-8 text-center text-slate-400">Nenhum projeto ainda. <a href="/projetos/novo" className="text-violet-300 underline">Criar projeto</a></div>
      ) : (
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Cliques", String(nAd), `${pct(nPv, nAd)}% viraram acesso`],
              ["PageViews", String(nPv), `${nVc} ViewContent`],
              ["Checkouts", String(nIc), `${pct(nIc, nPv)}% dos acessos`],
              ["Compras (tracker)", `${nPur} · ${brl(revenue)}`, `${pct(nPur, nIc)}% dos checkouts`],
            ].map(([k, v, s]) => (
              <div key={k} className="metric-card rounded-xl p-5"><p className="text-sm text-slate-400">{k}</p><p className="mt-2 text-2xl font-semibold">{v}</p><p className="mt-1 text-xs text-slate-500">{s}</p></div>
            ))}
          </div>
          <div className="metric-card overflow-x-auto rounded-xl">
            <div className="border-b border-white/10 p-5"><b>Pedidos dos gateways</b><p className="mt-1 text-sm text-slate-500">{orders.total} pedidos · {brl(orders.totalValue)} no período.</p></div>
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr>{["Status", "Qtd", "Valor", "%"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {[...orders.byStatus.entries()].map(([st, v]) => (
                  <tr key={st}><td className="font-medium">{st}</td><td>{v.n}</td><td>{brl(v.v)}</td><td>{pct(v.n, orders.total)}%</td></tr>
                ))}
                {!orders.total ? <tr><td colSpan={4} className="py-8 text-center text-slate-500">Sem pedidos de gateway neste período.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}
