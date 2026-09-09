import { sql } from "drizzle-orm";
import { PrivateSection } from "../../private-section";
import { ensureDb, getDb } from "@/db";
import { getProjectIds, getWorkspace, pct } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { workspaceId } = await getWorkspace();
  const { rows, ids } = await getProjectIds(workspaceId);
  const since = Math.floor(Date.now() / 1000) - 30 * 86400;
  let stats = { ad: 0, pv: 0, err: 0, dupVisitors: 0 };
  if (ids.length) {
    await ensureDb();
    const db = getDb();
    const [r] = (await db.execute(sql`
      SELECT SUM(CASE WHEN event_name='AdClick' THEN 1 ELSE 0 END)::int AS ad,
        SUM(CASE WHEN event_name='PageView' THEN 1 ELSE 0 END)::int AS pv,
        SUM(CASE WHEN event_name='PageError' THEN 1 ELSE 0 END)::int AS err
      FROM events WHERE project_id = ANY(${ids}) AND occurred_at >= ${since}
    `)) as unknown as { ad: number; pv: number; err: number }[];
    const [d] = (await db.execute(sql`
      SELECT COUNT(*)::int AS n FROM (
        SELECT visitor_id, COUNT(*) c FROM events
        WHERE project_id = ANY(${ids}) AND occurred_at >= ${since} AND visitor_id IS NOT NULL AND visitor_id <> ''
        GROUP BY visitor_id HAVING COUNT(*) > 30
      ) t
    `)) as unknown as { n: number }[];
    stats = { ad: Number(r?.ad ?? 0), pv: Number(r?.pv ?? 0), err: Number(r?.err ?? 0), dupVisitors: Number(d?.n ?? 0) };
  }
  const lost = Math.max(0, stats.ad - stats.pv);
  return (
    <PrivateSection title="Tráfego Inválido" description="Detecte bots, cliques perdidos e erros que drenam orçamento.">
      {!rows.length ? <div className="metric-card rounded-xl p-8 text-center text-slate-400">Sem dados.</div> : (
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
    </PrivateSection>
  );
}
