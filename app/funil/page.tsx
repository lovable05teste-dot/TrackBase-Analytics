import { AppShell } from "@/components/AppShell";
import { brl, getEventTotals, getProjectIds, getUtmBreakdown, getWorkspace, pct } from "@/lib/analytics";
import { Progress } from "@/components/ui/progress";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { workspaceId } = await getWorkspace();
  const { rows, ids } = await getProjectIds(workspaceId);
  const since = Math.floor(Date.now() / 1000) - 30 * 86400;
  const { byName, revenue } = await getEventTotals(ids, since);
  const nAd = byName.get("AdClick") ?? 0;
  const nPv = byName.get("PageView") ?? 0;
  const nVc = byName.get("ViewContent") ?? 0;
  const nIc = byName.get("InitiateCheckout") ?? 0;
  const nPur = byName.get("Purchase") ?? 0;
  const campaigns = await getUtmBreakdown(ids, since, "utm_campaign", 15);

  const steps: [string, number, number, string][] = [
    ["Cliques no anúncio", nAd, 100, "Base do funil"],
    ["Acessos (PageView)", nPv, pct(nPv, nAd), nAd ? `${nAd - nPv} cliques perdidos` : "Sem dados"],
    ["ViewContent", nVc, pct(nVc, nPv), "Página carregou e renderizou"],
    ["InitiateCheckout", nIc, pct(nIc, nPv), "Intenção de compra"],
    ["Purchase", nPur, pct(nPur, nIc), revenue > 0 ? brl(revenue) : "Sem faturamento"],
  ];

  const gargalo = (() => {
    if (!nAd) return "Sem dados suficientes para diagnosticar.";
    const lossClick = pct(nAd - nPv, nAd);
    const viewToIc = pct(nIc, nPv);
    const icToPur = nIc ? pct(nPur, nIc) : 0;
    if (lossClick > 30) return `Gargalo no carregamento: ${lossClick}% dos cliques não viram PageView. Otimize velocidade, hospedagem e anti-clone.`;
    if (viewToIc < 5 && nPv > 50) return `Gargalo na oferta: só ${viewToIc}% dos acessos iniciam checkout. Revise headline, prova e CTA acima da dobra.`;
    if (nIc > 10 && icToPur < 20) return `Gargalo no checkout: só ${icToPur}% dos checkouts compram. Revise preço, parcelas, Pix e fricção do gateway.`;
    return "Funil saudável para o volume atual. Escale as campanhas com melhor conversão.";
  })();

  return (
    <AppShell title="Análise de Funil" subtitle="Do clique à compra: onde o tráfego está vazando.">
      <div className="metric-card mb-4 rounded-xl border-violet-400/20 bg-violet-500/[.06] p-4 text-sm text-violet-100">💡 {gargalo}</div>
      <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <div className="metric-card rounded-xl p-5">
          <h3 className="font-semibold">Funil geral · 30 dias</h3>
          <div className="mt-5 space-y-4">
            {steps.map(([k, v, p, s]) => (
              <div key={k}><div className="mb-2 flex justify-between text-sm"><span>{k} · <b>{v}</b></span><span className="text-slate-400">{p}%</span></div><Progress value={Math.min(100, p)} className="h-2" /><p className="mt-1 text-xs text-slate-500">{s}</p></div>
            ))}
          </div>
        </div>
        <div className="metric-card overflow-x-auto rounded-xl">
          <div className="border-b border-white/10 p-5"><b>Funil por campanha</b><p className="mt-1 text-sm text-slate-500">Compare conversão acesso → compra por utm_campaign.</p></div>
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr>{["Campanha", "Cliques", "Acessos", "ICs", "Compras", "Conv."].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {campaigns.length ? campaigns.map((c) => (
                <tr key={c.name}><td className="max-w-[220px] truncate font-medium">{c.name}</td><td>{c.cliques}</td><td>{c.views}</td><td>{c.ics}</td><td>{c.compras}</td><td>{c.compras ? `${pct(c.compras, c.views || c.cliques)}%` : "—"}</td></tr>
              )) : <tr><td colSpan={6} className="py-8 text-center text-slate-500">{rows.length ? "Sem campanhas rastreadas." : "Nenhum projeto."}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
