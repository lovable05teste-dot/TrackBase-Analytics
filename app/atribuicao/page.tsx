import { AppShell } from "@/components/AppShell";
import { getEvents, getProjectIds, getWorkspace, pct } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { workspaceId } = await getWorkspace();
  const { rows, ids } = await getProjectIds(workspaceId);
  const since = Math.floor(Date.now() / 1000) - 30 * 86400;
  const list = await getEvents(ids, since);
  const views = list.filter((e) => e.eventName === "PageView");
  const hasFb = (v: string | null) => !!v && v !== "";
  const fbclid = views.filter((e) => hasFb(e.fbclid)).length;
  const utm = views.filter((e) => hasFb(e.utmSource)).length;
  const both = views.filter((e) => hasFb(e.fbclid) && hasFb(e.utmSource)).length;
  const total = views.length;
  const direct = Math.max(0, total - fbclid - utm + both);
  const srcMap = new Map<string, { source: string; n: number; compras: number }>();
  for (const e of list) {
    const s = (e.utmSource || "").trim() || "direto";
    const row = srcMap.get(s) ?? { source: s, n: 0, compras: 0 };
    row.n += 1;
    if (e.eventName === "Purchase") row.compras += 1;
    srcMap.set(s, row);
  }
  const bySource = [...srcMap.values()].sort((a, b) => b.n - a.n).slice(0, 20);

  return (
    <AppShell title="Atribuição" subtitle="De onde veio cada acesso: fbclid (Meta), UTMs ou direto. Base para Last-Click.">
      {!rows.length ? <div className="metric-card rounded-xl p-8 text-center text-slate-400">Sem projetos para atribuir.</div> : (
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["PageViews 30d", String(total), "Base atribuída"],
              ["Com fbclid", `${fbclid} · ${pct(fbclid, total)}%`, "Clique vindo da Meta"],
              ["Com UTM", `${utm} · ${pct(utm, total)}%`, "Template de URL ativo"],
              ["Direto / sem marcação", `${direct} · ${pct(direct, total)}%`, "Risco de atribuição perdida"],
            ].map(([k, v, s]) => (
              <div key={k} className="metric-card rounded-xl p-5"><p className="text-sm text-slate-400">{k}</p><p className="mt-2 text-2xl font-semibold">{v}</p><p className="mt-1 text-xs text-slate-500">{s}</p></div>
            ))}
          </div>
          <div className="metric-card overflow-x-auto rounded-xl">
            <div className="border-b border-white/10 p-5"><b>Modelo Last-Click por utm_source</b><p className="mt-1 text-sm text-slate-500">Todo o crédito vai para a última fonte marcada. {both} acessos têm fbclid + UTM (ideal).</p></div>
            <table className="w-full min-w-[520px] text-sm">
              <thead><tr>{["Fonte", "Eventos", "Compras", "Participação"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {bySource.map((s) => (
                  <tr key={s.source}><td className="font-medium">{s.source}</td><td>{s.n}</td><td>{s.compras}</td><td>{pct(s.n, total)}%</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500">Dica: mantenha o template `utm_source=facebook&utm_medium=paid&utm_campaign=...` em todos os anúncios para reduzir o “direto”.</p>
        </div>
      )}
    </AppShell>
  );
}
