import { AppShell } from "@/components/AppShell";
import { getEvents, getProjectIds, getUtmBreakdown, getWorkspace } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { workspaceId } = await getWorkspace();
  const { rows, ids } = await getProjectIds(workspaceId);
  const since = Math.floor(Date.now() / 1000) - 30 * 86400;
  const list = await getEvents(ids, since);
  const hours = Array.from({ length: 24 }, (_, h) => ({ h, n: 0, compras: 0 }));
  const weekdays = Array.from({ length: 7 }, (_, d) => ({ d, n: 0, compras: 0 }));
  for (const e of list) {
    const dt = new Date(e.occurredAt * 1000);
    const hh = hours[dt.getUTCHours()];
    hh.n += 1;
    if (e.eventName === "Purchase") hh.compras += 1;
    // 1970-01-01 foi quinta (4) → converte para 0=Dom..6=Sáb
    const wd = weekdays[(Math.floor(e.occurredAt / 86400) + 4) % 7];
    wd.n += 1;
    if (e.eventName === "Purchase") wd.compras += 1;
  }
  const contents = await getUtmBreakdown(ids, since, "utm_content", 12);
  const maxH = Math.max(1, ...hours.map((h) => h.n));
  const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <AppShell title="Heatmaps" subtitle="Quando o tráfego converte: mapa de calor por hora, dia e criativo.">
      {!rows.length ? <div className="metric-card rounded-xl p-8 text-center text-slate-400">Sem dados. Instale o tracker para gerar o heatmap.</div> : (
        <div className="grid gap-4">
          <div className="metric-card rounded-xl p-5">
            <b>Calor por hora (UTC) · 30 dias</b>
            <p className="mt-1 text-sm text-slate-500">Intensidade = volume de eventos. Número = compras.</p>
            <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8 xl:grid-cols-12">
              {hours.map(({ h, n, compras: c }) => {
                const intensity = Math.round((n / maxH) * 100);
                return (
                  <div key={h} title={`${h}h: ${n} eventos, ${c} compras`} className="rounded-lg border border-white/10 p-2 text-center" style={{ background: `rgba(117,92,255,${0.05 + (intensity / 100) * 0.5})` }}>
                    <div className="text-xs text-slate-400">{String(h).padStart(2, "0")}h</div>
                    <div className="text-sm font-semibold">{n}</div>
                    <div className="text-[11px] text-emerald-300">{c > 0 ? `${c} 🛒` : "—"}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="metric-card rounded-xl p-5">
              <b>Por dia da semana</b>
              <div className="mt-4 space-y-2">
                {dias.map((label, i) => {
                  const f = weekdays[i];
                  return <div key={label} className="flex items-center justify-between rounded-lg bg-white/[.03] p-3 text-sm"><span>{label}</span><span>{f.n} eventos · <b className="text-emerald-300">{f.compras} compras</b></span></div>;
                })}
              </div>
            </div>
            <div className="metric-card rounded-xl p-5">
              <b>Top criativos (utm_content)</b>
              <p className="mt-1 text-sm text-slate-500">Quais anúncios geram mais calor de compra.</p>
              <div className="mt-4 space-y-2">
                {contents.length ? contents.map((c) => (
                  <div key={c.name} className="flex items-center justify-between gap-3 rounded-lg bg-white/[.03] p-3 text-sm"><span className="truncate">{c.name}</span><span className="shrink-0">{c.views} acessos · <b>{c.compras} compras</b></span></div>
                )) : <p className="text-sm text-slate-500">Sem utm_content rastreado.</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
