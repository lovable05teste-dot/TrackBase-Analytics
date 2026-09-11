import { AppShell } from "@/components/AppShell";
import { brl, getEventTotals, getProjectIds, getWorkspace, pct } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { workspaceId } = await getWorkspace();
  const { rows, ids } = await getProjectIds(workspaceId);
  const now = Math.floor(Date.now() / 1000);
  const last7 = now - 7 * 86400;
  const prev7 = now - 14 * 86400;
  const cur = await getEventTotals(ids, last7);
  const tot14 = await getEventTotals(ids, prev7);
  const last30 = await getEventTotals(ids, now - 30 * 86400);

  const cPurch = cur.byName.get("Purchase") ?? 0;
  const cIc = cur.byName.get("InitiateCheckout") ?? 0;
  const cPv = cur.byName.get("PageView") ?? 0;
  const avgTicket = cPurch > 0 ? cur.revenue / cPurch : 0;
  const convIc = pct(cPurch, cIc);
  // Projeção com tendência: últimos 7d ajustados pela variação vs 7d anteriores
  const prevPurch = Math.max(0, (tot14.byName.get("Purchase") ?? 0) - cPurch);
  const projPurch = Math.max(0, Math.round(cPurch + (cPurch - prevPurch)));
  const projRev = projPurch * avgTicket;
  const trend30 = (last30.byName.get("Purchase") ?? 0) / 30;
  const trend7 = cPurch / 7;
  const trend = !cPurch && !prevPurch ? "sem dados" : trend7 > trend30 ? "alta" : trend7 < trend30 ? "queda" : "estável";
  const score = !ids.length ? 0 : Math.min(100, Math.round((cPv > 0 ? 30 : 0) + (cIc > 0 ? 30 : 0) + (cPurch > 0 ? 40 : 0)));

  const sugestoes: string[] = [];
  if (!ids.length) sugestoes.push("Crie um projeto e instale o tracker para ativar o Predict.");
  else {
    if (cPv > 50 && pct(cIc, cPv) < 5) sugestoes.push("Otimize a página: IC/accesso abaixo de 5%. Teste nova headline e CTA no primeiro scroll.");
    if (cIc >= 10 && convIc < 20) sugestoes.push(`Checkout com gargalo (${convIc}% IC→compra). Reduza fricção: Pix à vista, 1-click, prova perto do botão.`);
    if (avgTicket > 0 && avgTicket < 50) sugestoes.push(`Ticket médio baixo (${brl(avgTicket)}). Teste order bump / upsell para elevar o faturamento sem mais tráfego.`);
    if (trend === "queda") sugestoes.push("Tendência de queda vs média 30d. Revise frequência dos criativos e sobreposição de público.");
    if (!sugestoes.length) sugestoes.push("Base saudável. Escale +20% o orçamento das campanhas com ROAS > 2 e mantenha CAPI deduplicado.");
  }

  return (
    <AppShell title="Predict (IA)" subtitle="Projeção simples baseada nos últimos 7 e 30 dias + recomendações.">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Health score", `${score}/100`, `Tendência: ${trend}`],
          ["Compras 7d", String(cPurch), `${brl(cur.revenue)} no período`],
          ["Ticket médio", avgTicket ? brl(avgTicket) : "—", `${convIc}% IC→compra`],
          ["Projeção 7d", `${projPurch} compras`, `≈ ${brl(projRev)}`],
        ].map(([k, v, s]) => (
          <div key={k} className="metric-card rounded-xl p-5"><p className="text-sm text-slate-400">{k}</p><p className="mt-2 text-2xl font-semibold">{v}</p><p className="mt-1 text-xs text-slate-500">{s}</p></div>
        ))}
      </div>
      <div className="metric-card mt-4 rounded-xl p-5">
        <b>O que fazer agora</b>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
          {sugestoes.map((s) => <li key={s}>{s}</li>)}
        </ul>
        <p className="mt-4 text-xs text-slate-500">Modelo heurístico local (sem IA externa): média móvel + regras de funil. Conecte mais volume para previsões mais estáveis. Projetos: {rows.length}.</p>
      </div>
    </AppShell>
  );
}
