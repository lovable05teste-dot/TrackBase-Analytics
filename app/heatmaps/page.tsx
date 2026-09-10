import { AppShell } from "@/components/AppShell";
import { getEventPayloads, getEventTotals, getProjectIds, getWorkspace } from "@/lib/analytics";

export const dynamic = "force-dynamic";

const COLS = 24;
const ROWS = 32;

export default async function Page() {
  const { workspaceId } = await getWorkspace();
  const { rows, ids } = await getProjectIds(workspaceId);
  const since = Math.floor(Date.now() / 1000) - 30 * 86400;
  const [{ byName }, payloads] = await Promise.all([
    getEventTotals(ids, since),
    getEventPayloads(ids, since, ["Click", "Scroll"], 8000),
  ]);

  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  const els = new Map<string, number>();
  const pages = new Map<string, number>();
  const depths = new Map<number, number>();
  let clicks = 0;
  for (const e of payloads) {
    const p = e.payload;
    if (e.eventName === "Click") {
      const x = Number(p.x), y = Number(p.y), vw = Number(p.vw), vh = Number(p.vh);
      if (Number.isFinite(x) && Number.isFinite(y) && vw > 0 && vh > 0) {
        const c = Math.min(COLS - 1, Math.max(0, Math.floor((x / vw) * COLS)));
        const r = Math.min(ROWS - 1, Math.max(0, Math.floor((y / vh) * ROWS)));
        grid[r][c] += 1;
        clicks += 1;
      }
      const el = String(p.el || "").slice(0, 80);
      if (el) els.set(el, (els.get(el) ?? 0) + 1);
      const url = String(p.url || "").slice(0, 80);
      if (url) pages.set(url, (pages.get(url) ?? 0) + 1);
    } else if (e.eventName === "Scroll") {
      const d = Number(p.depth);
      if ([25, 50, 75, 100].includes(d)) depths.set(d, (depths.get(d) ?? 0) + 1);
    }
  }
  const max = Math.max(1, ...grid.flat());
  const topEls = [...els.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topPages = [...pages.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const pv = byName.get("PageView") ?? 0;

  return (
    <AppShell title="Heatmaps" subtitle="Cliques reais (coordenadas normalizadas) e profundidade de scroll dos últimos 30 dias.">
      {!rows.length ? <div className="metric-card rounded-xl p-8 text-center text-slate-400">Sem dados. Instale o tracker para gerar o heatmap.</div> : (
        <div className="grid gap-4">
          <div className="metric-card rounded-xl p-5">
            <b>Mapa de cliques · {clicks.toLocaleString("pt-BR")} cliques</b>
            <p className="mt-1 text-sm text-slate-500">Posição normalizada pela tela de cada visitante. Vermelho = mais cliques.</p>
            {clicks === 0 ? <p className="mt-4 text-sm text-slate-500">Ainda sem cliques capturados (o tracker novo coleta a partir da instalação).</p> : (
              <div className="mx-auto mt-4 max-w-md overflow-hidden rounded-xl border border-white/10" style={{ aspectRatio: "3/4" }}>
                <div className="grid h-full w-full" style={{ gridTemplateColumns: `repeat(${COLS},1fr)`, gridTemplateRows: `repeat(${ROWS},1fr)` }}>
                  {grid.map((row, r) => row.map((n, c) => {
                    const t = n / max;
                    return <div key={`${r}-${c}`} title={`${n} cliques`} style={{ background: n ? `rgba(255,${Math.round(60 + 120 * (1 - t))},60,${0.15 + t * 0.85})` : "rgba(255,255,255,.02)" }} />;
                  }))}
                </div>
              </div>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="metric-card rounded-xl p-5">
              <b>Profundidade de scroll</b>
              <p className="mt-1 text-sm text-slate-500">Visitantes que chegaram a cada marco ({pv.toLocaleString("pt-BR")} PageViews).</p>
              <div className="mt-4 space-y-2">
                {[25, 50, 75, 100].map((d) => {
                  const n = depths.get(d) ?? 0;
                  const rate = pv ? Math.round((n / pv) * 100) : 0;
                  return (
                    <div key={d}>
                      <div className="mb-1 flex justify-between text-xs text-slate-400"><span>{d}%</span><span>{n.toLocaleString("pt-BR")} · {rate}%</span></div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-[#ff0030] to-[#ff7a5c]" style={{ width: `${Math.min(100, rate)}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="metric-card rounded-xl p-5">
              <b>Elementos mais clicados</b>
              <div className="mt-4 space-y-2">
                {topEls.length ? topEls.map(([el, n]) => (
                  <div key={el} className="flex items-center justify-between gap-3 rounded-lg bg-white/[.03] p-3 text-sm"><span className="truncate font-mono text-xs">{el}</span><b className="shrink-0">{n.toLocaleString("pt-BR")}</b></div>
                )) : <p className="text-sm text-slate-500">Sem cliques ainda.</p>}
              </div>
            </div>
          </div>
          <div className="metric-card rounded-xl p-5">
            <b>Páginas com mais cliques</b>
            <div className="mt-4 space-y-2">
              {topPages.length ? topPages.map(([u, n]) => (
                <div key={u} className="flex items-center justify-between gap-3 rounded-lg bg-white/[.03] p-3 text-sm"><span className="truncate">{u}</span><b className="shrink-0">{n.toLocaleString("pt-BR")} cliques</b></div>
              )) : <p className="text-sm text-slate-500">Sem dados.</p>}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
