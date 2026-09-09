import { sql } from "drizzle-orm";
import { PrivateSection } from "../private-section";
import { ensureDb, getDb } from "@/db";
import { getProjectIds, getWorkspace, pct } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { workspaceId } = await getWorkspace();
  const { rows, ids } = await getProjectIds(workspaceId);
  const since = Math.floor(Date.now() / 1000) - 30 * 86400;
  let attr = { fbclid: 0, utm: 0, both: 0, direct: 0, total: 0 };
  let bySource: { source: string; n: number; compras: number }[] = [];
  if (ids.length) {
    await ensureDb();
    const db = getDb();
    const [r] = (await db.execute(sql`
      SELECT COUNT(*)::int AS total,
        SUM(CASE WHEN fbclid IS NOT NULL AND fbclid <> '' THEN 1 ELSE 0 END)::int AS fbclid,
        SUM(CASE WHEN utm_source IS NOT NULL AND utm_source <> '' THEN 1 ELSE 0 END)::int AS utm,
        SUM(CASE WHEN fbclid IS NOT NULL AND fbclid <> '' AND utm_source IS NOT NULL AND utm_source <> '' THEN 1 ELSE 0 END)::int AS both
      FROM events WHERE project_id = ANY(${ids}) AND occurred_at >= ${since} AND event_name='PageView'
    `)) as unknown as { total: number; fbclid: number; utm: number; both: number }[];
    attr = { fbclid: Number(r?.fbclid ?? 0), utm: Number(r?.utm ?? 0), both: Number(r?.both ?? 0), total: Number(r?.total ?? 0), direct: 0 };
    attr.direct = Math.max(0, attr.total - attr.fbclid - attr.utm + attr.both);
    bySource = (await db.execute(sql`
      SELECT COALESCE(NULLIF(utm_source,''),'direto') AS source, COUNT(*)::int AS n,
        SUM(CASE WHEN event_name='Purchase' THEN 1 ELSE 0 END)::int AS compras
      FROM events WHERE project_id = ANY(${ids}) AND occurred_at >= ${since}
      GROUP BY 1 ORDER BY n DESC LIMIT 20
    `)) as unknown as { source: string; n: number; compras: number }[];
  }

  return (
    <PrivateSection title="Atribuição" description="De onde veio cada acesso: fbclid (Meta), UTMs ou direto. Base para Last-Click.">
      {!rows.length ? <div className="metric-card rounded-xl p-8 text-center text-slate-400">Sem projetos para atribuir.</div> : (
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["PageViews 30d", String(attr.total), "Base atribuída"],
              ["Com fbclid", `${attr.fbclid} · ${pct(attr.fbclid, attr.total)}%`, "Clique vindo da Meta"],
              ["Com UTM", `${attr.utm} · ${pct(attr.utm, attr.total)}%`, "Template de URL ativo"],
              ["Direto / sem marcação", `${attr.direct} · ${pct(attr.direct, attr.total)}%`, "Risco de atribuição perdida"],
            ].map(([k, v, s]) => (
              <div key={k} className="metric-card rounded-xl p-5"><p className="text-sm text-slate-400">{k}</p><p className="mt-2 text-2xl font-semibold">{v}</p><p className="mt-1 text-xs text-slate-500">{s}</p></div>
            ))}
          </div>
          <div className="metric-card overflow-hidden rounded-xl">
            <div className="border-b border-white/10 p-5"><b>Modelo Last-Click por utm_source</b><p className="mt-1 text-sm text-slate-500">Todo o crédito vai para a última fonte marcada. {attr.both} acessos têm fbclid + UTM (ideal).</p></div>
            <table className="w-full min-w-[520px] text-sm">
              <thead><tr>{["Fonte", "Eventos", "Compras", "Participação"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {bySource.map((s) => (
                  <tr key={s.source}><td className="font-medium">{s.source}</td><td>{s.n}</td><td>{s.compras}</td><td>{pct(s.n, attr.total)}%</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500">Dica: mantenha o template `utm_source=facebook&utm_medium=paid&utm_campaign=...` em todos os anúncios para reduzir o “direto”.</p>
        </div>
      )}
    </PrivateSection>
  );
}
