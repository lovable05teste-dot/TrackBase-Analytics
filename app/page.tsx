import { and, count, eq, gte, inArray, isNotNull, ne, sql, sum, type SQL } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireChatGPTUser } from "./chatgpt-auth";
import { ensureDb, getDb } from "@/db";
import { events, projects } from "@/db/schema";
import { requestUserId, sha256 } from "@/lib/trackbase-security";
import { SoundNotifications } from "@/components/SoundNotifications";
import { AppShell } from "@/components/AppShell";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const periods: [string, string][] = [["last_7d", "7 dias"], ["last_30d", "30 dias"], ["all", "Tudo"]];

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams?: Promise<{ period?: string }> }) {
  await requireChatGPTUser("/");
  const sp = await searchParams;
  const period = sp?.period === "last_7d" || sp?.period === "all" ? sp.period : "last_30d";
  const since = period === "all" ? null : Math.floor(Date.now() / 1000) - (period === "last_7d" ? 7 : 30) * 86400;

  const forwarded = new Headers();
  for (const [key, value] of (await headers()).entries()) forwarded.set(key, value);
  const cookieValue = (await cookies()).toString();
  if (cookieValue) forwarded.set("cookie", cookieValue);
  const userId = await requestUserId(new Request("http://trackbase.local", { headers: forwarded }));
  const workspaceId = userId ? "ws_" + (await sha256(userId)).slice(0, 24) : null;

  await ensureDb();
  const db = getDb();
  const projectRows = workspaceId ? await db.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.workspaceId, workspaceId)) : [];
  const ids = projectRows.map((p) => p.id);

  const conditions: SQL[] = [];
  if (ids.length) conditions.push(inArray(events.projectId, ids));
  if (since) conditions.push(gte(events.occurredAt, since));

  const totalRows = conditions.length
    ? await db.select({ eventName: events.eventName, n: count() }).from(events).where(and(...conditions)).groupBy(events.eventName)
    : [];
  const total = new Map<string, number>();
  for (const row of totalRows) total.set(row.eventName, Number(row.n));
  const nAd = total.get("AdClick") ?? 0;
  const nPv = total.get("PageView") ?? 0;
  const nErr = total.get("PageError") ?? 0;
  const nIc = total.get("InitiateCheckout") ?? 0;
  const nPur = total.get("Purchase") ?? 0;

  const revConditions: SQL[] = [...conditions, eq(events.eventName, "Purchase")];
  const [revRow] = conditions.length ? await db.select({ v: sum(events.value) }).from(events).where(and(...revConditions)) : [];
  const totalRevenue = Number(revRow?.v ?? 0);

  const campConditions: SQL[] = [...conditions, isNotNull(events.utmCampaign), ne(events.utmCampaign, "")];
  const campRows = conditions.length
    ? await db.select({ campaign: events.utmCampaign, eventName: events.eventName, n: count(), revenue: sum(events.value) }).from(events).where(and(...campConditions)).groupBy(events.utmCampaign, events.eventName)
    : [];
  const perCampaign = new Map<string, { cliques: number; acessos: number; erros: number; ics: number; compras: number; receita: number }>();
  for (const row of campRows) {
    const key = row.campaign ?? "";
    const c = perCampaign.get(key) ?? { cliques: 0, acessos: 0, erros: 0, ics: 0, compras: 0, receita: 0 };
    const n = Number(row.n);
    const value = Number(row.revenue ?? 0);
    if (row.eventName === "AdClick") c.cliques += n;
    else if (row.eventName === "PageView") c.acessos += n;
    else if (row.eventName === "PageError") c.erros += n;
    else if (row.eventName === "InitiateCheckout") c.ics += n;
    else if (row.eventName === "Purchase") { c.compras += n; c.receita += value; }
    perCampaign.set(key, c);
  }
  const campaigns = [...perCampaign.entries()]
    .map(([name, c]) => ({ name, ...c }))
    .sort((a, b) => b.compras - a.compras || b.cliques - a.cliques)
    .slice(0, 20);

  const [lostRow] = conditions.length
    ? await db.execute(sql`SELECT COUNT(*)::int AS n FROM (SELECT DISTINCT visitor_id FROM events WHERE project_id = ANY(${ids}) AND event_name = 'AdClick' AND occurred_at >= ${since ?? 0} EXCEPT SELECT DISTINCT visitor_id FROM events WHERE project_id = ANY(${ids}) AND event_name = 'PageView' AND occurred_at >= ${since ?? 0}) t`)
    : [];
  const lostClicks = conditions.length ? Number(lostRow?.n ?? 0) : 0;
  const taxa = nAd > 0 ? Math.round((nPv / nAd) * 100) : null;
  const hasData = conditions.length && (nAd > 0 || nPv > 0 || nErr > 0);

  const metrics: [string, string, string, string][] = [
    ["Cliques no anúncio", String(nAd), "Meta/UTM", nAd ? `${taxa ?? 0}% carregados` : "Aguardando eventos reais"],
    ["Acessos à página", String(nPv), "PageView", nAd ? `${pct(nPv, nAd)}% dos cliques` : "Aguardando eventos reais"],
    ["Erros de acesso", String(nErr), "Falhas", nErr ? "Erros no carregamento" : "Sem erros capturados"],
    ["Inícios de checkout", String(nIc), "IC", nIc ? "Aguardando confirmação" : "Cliques em checkout"],
    ["Compras aprovadas", String(nPur), "Purchase", nPur ? brl.format(totalRevenue) : "Sem faturamento"],
  ];

  const funil: [string, number, number][] = [
    ["Cliques", nAd, 0],
    ["Acessos à página", nPv, pct(nPv, nAd)],
    ["Erros de acesso", nErr, pct(nErr, nPv)],
    ["Inícios de checkout", nIc, pct(nIc, nPv)],
    ["Compras aprovadas", nPur, pct(nPur, nIc)],
  ];

  return (
    <AppShell title="Dashboard" subtitle="Resultados consolidados dos seus anúncios" activeTracking={projectRows.length > 0}>
      <SoundNotifications />
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">Performance</h2>
              <p className="text-sm text-slate-500">Atribuição por UTMs, fbclid, Pixel e CAPI.</p>
            </div>
            <div className="flex items-center gap-2">
              {periods.map(([p, label]) => (
                <a key={p} href={`/?period=${p}`} className={`rounded-lg border px-3 py-2 text-sm ${period === p ? "border-violet-400/40 bg-violet-500/15 text-violet-200" : "border-white/10 text-slate-400 hover:bg-white/5"}`}>{label}</a>
              ))}
              <a href="/integracoes" className="ml-2 rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5">Conectar Pixel</a>
            </div>
          </div>

          {hasData ? (
            <div className="mb-4 rounded-xl border border-emerald-400/15 bg-emerald-400/[.06] px-4 py-3 text-sm text-emerald-200">Dados reais dos últimos {period === "all" ? "eventos recebidos" : period === "last_7d" ? "7 dias" : "30 dias"}.</div>
          ) : (
            <div className="mb-4 rounded-xl border border-violet-400/15 bg-violet-400/[.06] px-4 py-3 text-sm text-violet-200">Os números começam em zero e aumentam somente quando a TrackBase recebe eventos reais.</div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {metrics.map((m) => (
              <Card className="metric-card" key={m[0]}><CardContent className="p-5">
                <div className="flex justify-between gap-2 text-sm"><span className="text-slate-400">{m[0]}</span><span className="text-violet-300">{m[2]}</span></div>
                <div className="mt-3 text-3xl font-semibold">{m[1]}</div>
                <p className="mt-3 text-xs text-slate-500">{m[3]}</p>
              </CardContent></Card>
            ))}
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[.85fr_1.55fr]">
            <Card className="metric-card"><CardContent className="p-5">
              <h3 className="font-semibold">Qualidade dos acessos</h3>
              <p className="text-sm text-slate-500">Diferença entre o clique e a página carregada</p>
              <div className="mt-6 space-y-4 text-sm">
                <div className="flex justify-between rounded-lg bg-white/[.03] p-4"><span>Cliques sem PageView</span><b>{lostClicks}</b></div>
                <div className="flex justify-between rounded-lg bg-white/[.03] p-4"><span>Taxa de carregamento</span><b>{taxa === null ? "N/A" : `${taxa}%`}</b></div>
                <div className="flex justify-between rounded-lg bg-white/[.03] p-4"><span>Erros capturados</span><b>{nErr}</b></div>
              </div>
            </CardContent></Card>

            <Card className="metric-card"><CardContent className="p-5">
              <h3 className="font-semibold">Funil de conversão</h3>
              <p className="mb-6 text-sm text-slate-500">Do clique até a compra aprovada</p>
              {funil.map((x) => (
                <div className="mb-4" key={x[0]}>
                  <div className="mb-2 flex justify-between text-sm"><span>{x[0]}</span><b>{x[1]}</b></div>
                  <Progress value={x[2]} className="h-2" />
                </div>
              ))}
            </CardContent></Card>
          </div>

          <Card className="metric-card mt-5 overflow-hidden"><CardContent className="p-0">
            <div className="border-b border-white/7 p-5">
              <h3 className="font-semibold">Campanhas</h3>
              <p className="text-sm text-slate-500">Cliques, acessos, checkouts e compras por campanha (utm_campaign)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead><tr>{["Campanha", "Cliques", "Acessos", "Erros", "ICs", "Compras", "Receita", "Conversão"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {campaigns.length ? campaigns.map((r) => (
                    <tr key={r.name}>
                      <td className="font-medium">{r.name}</td>
                      <td>{r.cliques}</td>
                      <td>{r.acessos}</td>
                      <td>{r.erros}</td>
                      <td>{r.ics}</td>
                      <td>{r.compras}</td>
                      <td>{r.receita > 0 ? brl.format(r.receita) : "—"}</td>
                      <td>{r.compras > 0 ? `${pct(r.compras, r.acessos || r.cliques)}%` : "—"}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={8} className="py-10 text-center text-slate-500">{projectRows.length ? "Nenhuma campanha rastreada neste período." : "Nenhum projeto rastreado ainda."}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent></Card>
    </AppShell>
  );
}