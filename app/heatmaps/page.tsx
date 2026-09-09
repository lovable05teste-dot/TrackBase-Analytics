import { sql } from "drizzle-orm";
import { PrivateSection } from "../private-section";
import { ensureDb, getDb } from "@/db";
import { getProjectIds, getUtmBreakdown, getWorkspace } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { workspaceId } = await getWorkspace();
  const { rows, ids } = await getProjectIds(workspaceId);
  const since = Math.floor(Date.now() / 1000) - 30 * 86400;
  let hours: { h: number; n: number; compras: number }[] = [];
  let weekdays: { d: number; n: number; compras: number }[] = [];
  if (ids.length) {
    await ensureDb();
    const db = getDb();
    // SQLite/Postgres: occurred_at é unix seconds. Extrai hora/dia em UTC.
    const hRows = (await db.execute(sql`
      SELECT (occurred_at % 86400 / 3600)::int AS h, COUNT(*)::int AS n,
        SUM(CASE WHEN event_name='Purchase' THEN 1 ELSE 0 END)::int AS compras
      FROM events WHERE project_id = ANY(${ids}) AND occurred_at >= ${since}
      GROUP BY h ORDER BY h
    `)) as unknown as { h: number; n: number; compras: number }[];
    hours = hRows;
    const dRows = (await db.execute(sql`
      SELECT ((occurred_at / 86400 + 4) % 7)::int AS d, COUNT(*)::int AS n,
        SUM(CASE WHEN event_name='Purchase' THEN 1 ELSE 0 END)::int AS compras
      FROM events WHERE project_id = ANY(${ids}) AND occurred_at >= ${since}
      GROUP BY d ORDER BY d
    `)) as unknown as { d: number; n: number; compras: number }[];
    weekdays = dRows;
  }
  const contents = await getUtmBreakdown(ids, since, "utm_content", 12);
  const maxH = Math.max(1, ...hours.map((h) => h.n));
  const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <PrivateSection title="Heatmaps" description="Quando o tráfego converte: mapa de calor por hora, dia e criativo.">
      {!rows.length ? <div className="metric-card rounded-xl p-8 text-center text-slate-400">Sem dados. Instale o tracker para gerar o heatmap.</div> : (
        <div className="grid gap-4">
          <div className="metric-card rounded-xl p-5">
            <b>Calor por hora (UTC) · 30 dias</b>
            <p className="mt-1 text-sm text-slate-500">Intensidade = volume de eventos. Número = compras.</p>
            <div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-12">
              {Array.from({ length: 24 }, (_, h) => {
                const f = hours.find((x) => Number(x.h) === h);
                const n = f?.n ?? 0;
                const c = f?.compras ?? 0;
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
                  const f = weekdays.find((x) => Number(x.d) === i);
                  return <div key={label} className="flex items-center justify-between rounded-lg bg-white/[.03] p-3 text-sm"><span>{label}</span><span>{f?.n ?? 0} eventos · <b className="text-emerald-300">{f?.compras ?? 0} compras</b></span></div>;
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
    </PrivateSection>
  );
}
