import { AppShell } from "@/components/AppShell";
import { brl, getProjectIds, getUtmBreakdown, getWorkspace, pct } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { workspaceId } = await getWorkspace();
  const { rows, ids } = await getProjectIds(workspaceId);
  const since = Math.floor(Date.now() / 1000) - 30 * 86400;
  const campaigns = await getUtmBreakdown(ids, since, "utm_campaign", 20);
  const topReceita = [...campaigns].sort((a, b) => b.receita - a.receita).slice(0, 10);
  const topConv = [...campaigns].filter((c) => c.views >= 20).sort((a, b) => pct(b.compras, b.views || b.cliques) - pct(a.compras, a.views || a.cliques)).slice(0, 10);
  return (
    <AppShell title="Rankings" subtitle="Quem converte mais: ranking por faturamento e conversão.">
      {!rows.length ? <div className="metric-card rounded-xl p-8 text-center text-slate-400">Sem dados para rankear.</div> : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="metric-card overflow-x-auto rounded-xl">
            <div className="border-b border-white/10 p-5"><b>🏆 Top faturamento</b></div>
            <table className="w-full text-sm"><thead><tr><th>#</th><th>Campanha</th><th>Compras</th><th>Receita</th></tr></thead>
              <tbody>{topReceita.map((c, i) => <tr key={c.name}><td>{i + 1}</td><td className="max-w-[200px] truncate font-medium">{c.name}</td><td>{c.compras}</td><td>{c.receita ? brl(c.receita) : "—"}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="metric-card overflow-x-auto rounded-xl">
            <div className="border-b border-white/10 p-5"><b>⚡ Top conversão (min. 20 acessos)</b></div>
            <table className="w-full text-sm"><thead><tr><th>#</th><th>Campanha</th><th>Acessos</th><th>Conv.</th></tr></thead>
              <tbody>{topConv.length ? topConv.map((c, i) => <tr key={c.name}><td>{i + 1}</td><td className="max-w-[200px] truncate font-medium">{c.name}</td><td>{c.views}</td><td>{pct(c.compras, c.views || c.cliques)}%</td></tr>) : <tr><td colSpan={4} className="py-8 text-center text-slate-500">Volume insuficiente.</td></tr>}</tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}
