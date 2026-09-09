import { PrivateSection } from "../../private-section";
import { brl, getProjectIds, getUtmBreakdown, getWorkspace, pct } from "@/lib/analytics";

export const dynamic = "force-dynamic";

async function Table({ title, desc, rows }: { title: string; desc: string; rows: { name: string; cliques: number; views: number; ics: number; compras: number; receita: number }[] }) {
  return (
    <div className="metric-card overflow-hidden rounded-xl">
      <div className="border-b border-white/10 p-5"><b>{title}</b><p className="mt-1 text-sm text-slate-500">{desc}</p></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead><tr>{["Valor", "Cliques", "Acessos", "ICs", "Compras", "Receita", "Conv."].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.length ? rows.map((r) => (
              <tr key={r.name}><td className="max-w-[260px] truncate font-medium">{r.name}</td><td>{r.cliques}</td><td>{r.views}</td><td>{r.ics}</td><td>{r.compras}</td><td>{r.receita > 0 ? brl(r.receita) : "—"}</td><td>{r.compras > 0 ? `${pct(r.compras, r.views || r.cliques)}%` : "—"}</td></tr>
            )) : <tr><td colSpan={7} className="py-8 text-center text-slate-500">Sem dados para este campo.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function Page() {
  const { workspaceId } = await getWorkspace();
  const { rows, ids } = await getProjectIds(workspaceId);
  const since = Math.floor(Date.now() / 1000) - 30 * 86400;
  const [sources, campaigns, mediums, contents, terms] = await Promise.all([
    getUtmBreakdown(ids, since, "utm_source"),
    getUtmBreakdown(ids, since, "utm_campaign"),
    getUtmBreakdown(ids, since, "utm_medium"),
    getUtmBreakdown(ids, since, "utm_content", 30),
    getUtmBreakdown(ids, since, "utm_term", 30),
  ]);
  return (
    <PrivateSection title="Relatórios de UTMs" description="Performance por source, campaign, medium, content e term nos últimos 30 dias.">
      {!rows.length ? <div className="metric-card rounded-xl p-8 text-center text-slate-400">Crie um projeto e instale as UTMs para ver dados aqui.</div> : (
        <div className="grid gap-4">
          <Table title="utm_source" desc="De onde veio o clique: facebook, instagram, etc." rows={sources} />
          <Table title="utm_campaign" desc="Campanha + ID vindos do template da Meta." rows={campaigns} />
          <Table title="utm_medium" desc="paid, organic, cpc..." rows={mediums} />
          <Table title="utm_content" desc="Anúncio + ID (criativo que converte)." rows={contents} />
          <Table title="utm_term" desc="Conjunto + ID (adset)." rows={terms} />
        </div>
      )}
    </PrivateSection>
  );
}
