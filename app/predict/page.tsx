import { AppShell } from "@/components/AppShell";
import { brl, getEvents, getProjectIds, getWorkspace, pct } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { workspaceId } = await getWorkspace();
  const { rows, ids } = await getProjectIds(workspaceId);
  const now = Math.floor(Date.now() / 1000);
  const day = 86400;
  const start14 = now - 14 * day;
  const start7 = now - 7 * day;
  const list = ids.length ? await getEvents(ids, start14) : [];

  const daily: Array<{ key: string; revenue: number; purch: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date((now - i * day) * 1000);
    daily.push({ key: d.toISOString().slice(0, 10), revenue: 0, purch: 0 });
  }
  const idx = (ts: number) => {
    const k = new Date(ts * 1000).toISOString().slice(0, 10);
    return daily.findIndex((d) => d.key === k);
  };
  let cPurch = 0, cIc = 0, cPv = 0, cRev = 0;
  const camp = new Map<string, { rev7: number; revPrev: number; purch7: number }>();
  for (const e of list) {
    const i = idx(e.occurredAt);
    const in7 = e.occurredAt >= start7;
    if (e.eventName === "Purchase") {
      if (i >= 0) {
        daily[i].revenue += e.value;
        daily[i].purch += 1;
      }
      if (in7) {
        cPurch += 1;
        cRev += e.value;
      }
      const name = (e.utmCampaign || "Sem campanha").trim() || "Sem campanha";
      const c = camp.get(name) ?? { rev7: 0, revPrev: 0, purch7: 0 };
      if (in7) {
        c.rev7 += e.value;
        c.purch7 += 1;
      } else c.revPrev += e.value;
      camp.set(name, c);
    } else if (e.eventName === "InitiateCheckout" && in7) cIc += 1;
    else if (e.eventName === "PageView" && in7) cPv += 1;
  }

  // Regressão linear na receita diária (14d) → projeção 7d
  const n = daily.length;
  const sx = ((n - 1) * n) / 2;
  const sxx = ((n - 1) * n * (2 * n - 1)) / 6;
  const sy = daily.reduce((s, d) => s + d.revenue, 0);
  const sxy = daily.reduce((s, d, i) => s + i * d.revenue, 0);
  const slope = (n * sxy - sx * sy) / Math.max(1e-9, n * sxx - sx * sx);
  const intercept = (sy - slope * sx) / n;
  const projRev = Math.max(0, Math.round([14, 15, 16, 17, 18, 19, 20].reduce((s, x) => s + intercept + slope * x, 0)));
  const avgTicket = cPurch > 0 ? cRev / cPurch : 0;
  const projPurch = avgTicket > 0 ? Math.round(projRev / avgTicket) : 0;

  // Anomalia: ontem vs média±2σ das compras diárias
  const vals = daily.map((d) => d.purch);
  const mean = vals.reduce((s, v) => s + v, 0) / Math.max(1, vals.length);
  const sd = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, vals.length));
  const yesterday = daily.length >= 2 ? daily[daily.length - 2].purch : 0;
  const anomaly = sd > 0 && Math.abs(yesterday - mean) > 2 * sd ? (yesterday < mean ? "queda" : "pico") : null;

  const convIc = pct(cPurch, cIc);
  const trendRev = daily.slice(0, 7).reduce((s, d) => s + d.revenue, 0);
  const trend = cRev > trendRev ? "alta" : cRev < trendRev ? "queda" : "estável";
  const score = !ids.length ? 0 : Math.min(100, Math.round((cPv > 0 ? 30 : 0) + (cIc > 0 ? 30 : 0) + (cPurch > 0 ? 40 : 0)));
  const topCamp = [...camp.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.rev7 - a.rev7).slice(0, 5);

  const sugestoes: string[] = [];
  if (!ids.length) sugestoes.push("Crie um projeto e instale o tracker para ativar o Predict.");
  else {
    if (anomaly === "queda") sugestoes.push(`Anomalia: ontem vendeu ${yesterday} (média ${mean.toFixed(1)}/dia). Verifique campanhas pausadas, site fora do ar e forma de pagamento.`);
    if (anomaly === "pico") sugestoes.push(`Pico ontem (${yesterday} vendas vs média ${mean.toFixed(1)}). Descubra a campanha e escale +20% com ROAS protegido.`);
    if (cPv > 50 && pct(cIc, cPv) < 5) sugestoes.push("Otimize a página: IC/accesso abaixo de 5%. Teste nova headline e CTA no primeiro scroll.");
    if (cIc >= 10 && convIc < 20) sugestoes.push(`Checkout com gargalo (${convIc}% IC→compra). Reduza fricção: Pix à vista, 1-click, prova perto do botão.`);
    if (avgTicket > 0 && avgTicket < 50) sugestoes.push(`Ticket médio baixo (${brl(avgTicket)}). Teste order bump / upsell para elevar o faturamento sem mais tráfego.`);
    for (const c of topCamp.slice(0, 2)) {
      if (c.revPrev > 0 && c.rev7 < c.revPrev * 0.6) sugestoes.push(`"${c.name}" caiu ${Math.round((1 - c.rev7 / c.revPrev) * 100)}% vs 7d anteriores. Revise criativo e frequência.`);
    }
    if (!sugestoes.length) sugestoes.push("Base saudável. Escale +20% o orçamento das campanhas com ROAS > 2 e mantenha CAPI deduplicado.");
  }

  return (
    <AppShell title="Predict" subtitle="Projeção por regressão linear (14d) + detecção de anomalia + tendência por campanha.">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Health score", `${score}/100`, `Tendência: ${trend}`],
          ["Compras 7d", String(cPurch), `${brl(cRev)} no período`],
          ["Ticket médio", avgTicket ? brl(avgTicket) : "—", `${convIc}% IC→compra`],
          ["Projeção 7d", `${projPurch} compras`, `≈ ${brl(projRev)}${anomaly ? ` · anomalia: ${anomaly} ontem` : ""}`],
        ].map(([k, v, s]) => (
          <div key={k} className="metric-card rounded-xl p-5"><p className="text-sm text-slate-400">{k}</p><p className="mt-2 text-2xl font-semibold">{v}</p><p className="mt-1 text-xs text-slate-500">{s}</p></div>
        ))}
      </div>
      <div className="metric-card mt-4 overflow-x-auto rounded-xl">
        <div className="border-b border-white/10 p-5"><b>Campanhas 7d vs 7d anteriores</b></div>
        <table className="w-full min-w-[560px] text-sm">
          <thead><tr><th className="p-3 text-left">Campanha</th><th className="p-3 text-right">Fat. 7d</th><th className="p-3 text-right">Fat. ant.</th><th className="p-3 text-right">Vendas</th><th className="p-3 text-right">Tendência</th></tr></thead>
          <tbody>
            {topCamp.length ? topCamp.map((c) => {
              const d = c.revPrev > 0 ? Math.round(((c.rev7 - c.revPrev) / c.revPrev) * 100) : null;
              return <tr key={c.name} className="border-t border-white/10"><td className="max-w-[240px] truncate p-3">{c.name}</td><td className="p-3 text-right">{brl(c.rev7)}</td><td className="p-3 text-right text-slate-400">{brl(c.revPrev)}</td><td className="p-3 text-right">{c.purch7}</td><td className={`p-3 text-right font-medium ${d == null ? "" : d >= 0 ? "text-emerald-300" : "text-red-300"}`}>{d == null ? "—" : `${d > 0 ? "+" : ""}${d}%`}</td></tr>;
            }) : <tr><td colSpan={5} className="p-8 text-center text-slate-500">Sem campanhas com UTM.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="metric-card mt-4 rounded-xl p-5">
        <b>O que fazer agora</b>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
          {sugestoes.map((s) => <li key={s}>{s}</li>)}
        </ul>
        <p className="mt-4 text-xs text-slate-500">Modelo estatístico local (regressão + 2σ, sem IA externa). Projetos: {rows.length}.</p>
      </div>
    </AppShell>
  );
}
