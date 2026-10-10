"use client";
import { useCallback, useEffect, useState } from "react";
import { Check, CheckCircle2, Copy, ExternalLink, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";
import { apiFetch } from "@/lib/plan-client";

type Item = { id: string; name: string; status: string; account: string; spend: number; impressions: number; clicks: number; cpc: number | null; ctr: number | null; pageViews: number; checkouts: number; sales: number; revenue: number; pendingSales: number; profit: number; roas: number | null; cpa: number | null };
type Totals = { spend: number; impressions: number; clicks: number; sales: number; revenue: number; profit: number; roas: number | null; tiktokSales: number; tiktokRevenue: number };
type Account = { advertiserId: string; name: string; currency: string | null; timezone: string | null; selected: boolean };
type Project = { id: string; name: string; domain: string | null; pixelCode: string | null; hasToken: boolean; testCode: string | null };

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const num = (v: number) => new Intl.NumberFormat("pt-BR").format(Math.round(v || 0));
const UTM = "utm_source=tiktok&utm_medium=paid&utm_campaign=__CAMPAIGN_NAME__|__CAMPAIGN_ID__&utm_term=__AID_NAME__|__AID__&utm_content=__CID_NAME__|__CID__";
const PERIODS: [string, string][] = [["today", "Hoje"], ["yesterday", "Ontem"], ["last_7d", "7 dias"], ["last_30d", "30 dias"], ["this_month", "Este mês"]];
const MESSAGES: Record<string, string> = { cancelado: "Autorização cancelada no TikTok.", sessao: "A conexão expirou. Tente de novo.", sem_contas: "O TikTok não retornou contas de anúncios.", oauth: "Não foi possível concluir a conexão.", config: "A conexão com o TikTok ainda não está configurada no servidor.", start: "Não foi possível iniciar a conexão.", retorno: "Retorno incompleto do TikTok." };

async function readJson(r: Response) { const t = await r.text(); try { return t ? JSON.parse(t) : {}; } catch { throw new Error(`Resposta inválida (${r.status}).`); } }

export function TiktokAdsClient() {
  const [period, setPeriod] = useState("today");
  const [status, setStatus] = useState("ACTIVE");
  const [items, setItems] = useState<Item[] | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [failures, setFailures] = useState<{ account: string; error: string }[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [configured, setConfigured] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [link, setLink] = useState<{ tiktokUrl: string; expiresAt: number } | null>(null);
  const [copied, setCopied] = useState("");
  const [form, setForm] = useState({ projectId: "", pixelCode: "", accessToken: "", testCode: "" });

  const loadCampaigns = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/tiktok/campaigns?period=${p}`, { cache: "no-store" });
      const b = await readJson(r);
      if (!r.ok) throw new Error(b.error || "Falha ao carregar campanhas.");
      setItems(b.items || []); setTotals(b.totals || null); setFailures(b.failures || []);
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao carregar campanhas."); }
    finally { setLoading(false); }
  }, []);
  const loadSetup = useCallback(async () => {
    try {
      const [a, p] = await Promise.all([fetch("/api/tiktok/accounts", { cache: "no-store" }), fetch("/api/tiktok/pixel", { cache: "no-store" })]);
      if (a.status === 401) { window.location.assign("/login?return_to=%2Ftiktok"); return; }
      const ab = await readJson(a), pb = await readJson(p);
      setAccounts(ab.accounts || []); setConfigured(ab.configured !== false);
      const list: Project[] = pb.projects || [];
      setProjects(list);
      setForm((f) => { if (f.projectId) return f; const first = list.find((x) => x.pixelCode) || list[0]; return first ? { projectId: first.id, pixelCode: first.pixelCode || "", accessToken: "", testCode: first.testCode || "" } : f; });
    } catch { setError("Não foi possível carregar a configuração do TikTok."); }
  }, []);

  useEffect(() => { const t = window.setTimeout(() => void loadSetup(), 0); return () => window.clearTimeout(t); }, [loadSetup]);
  useEffect(() => { const t = window.setTimeout(() => void loadCampaigns(period), 0); return () => window.clearTimeout(t); }, [loadCampaigns, period]);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const q = new URLSearchParams(window.location.search);
      if (q.get("erro")) setError(MESSAGES[q.get("erro")!] || "Não foi possível conectar.");
      else if (q.get("conectado") === "1") setOk(`TikTok conectado: ${q.get("contas") || ""} conta(s). Vincule abaixo as que entram nas campanhas.`);
      if (q.has("erro") || q.has("conectado")) window.history.replaceState(null, "", window.location.pathname);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  async function run(tag: string, fn: () => Promise<void>) {
    setBusy(tag); setError(""); setOk("");
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível concluir."); } finally { setBusy(""); }
  }
  const copy = async (text: string, tag: string) => { if (await copyText(text)) { setCopied(tag); setTimeout(() => setCopied(""), 1800); } else setError("Não foi possível copiar. Selecione o texto e copie manualmente."); };

  const toggle = (a: Account) => run(a.advertiserId, async () => {
    const r = await apiFetch("/api/tiktok/accounts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ advertiserId: a.advertiserId, enabled: !a.selected }) });
    const b = await readJson(r); if (!r.ok) throw new Error(b.error || "Falha ao vincular.");
    setAccounts(b.accounts || []); await loadCampaigns(period);
  });
  const removeAll = () => { if (!confirm("Desconectar todas as contas do TikTok da GhostScale?")) return; void run("remove", async () => {
    const r = await apiFetch("/api/tiktok/accounts", { method: "DELETE" }); const b = await readJson(r); if (!r.ok) throw new Error(b.error || "Falha ao remover.");
    setAccounts(b.accounts || []); setItems([]); setOk("Contas do TikTok desconectadas.");
  }); };
  const makeLink = () => run("link", async () => {
    const r = await apiFetch("/api/meta/connect-link", { method: "POST" }); const b = await readJson(r); if (!r.ok) throw new Error(b.error || "Falha ao gerar o link.");
    setLink(b); await copy(b.tiktokUrl, "link");
  });
  const savePixel = (e: React.FormEvent) => { e.preventDefault(); void run("pixel", async () => {
    const r = await apiFetch("/api/tiktok/pixel", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) }); const b = await readJson(r); if (!r.ok) throw new Error(b.error || "Falha ao salvar.");
    setProjects(b.projects || []); setForm((f) => ({ ...f, accessToken: "" })); setOk("Pixel TikTok salvo. O script da GhostScale já carrega o pixel e as vendas vão para o TikTok pelo servidor.");
  }); };
  const removePixel = (p: Project) => { if (!confirm(`Remover o Pixel TikTok do projeto ${p.name}?`)) return; void run("pixel", async () => {
    const r = await apiFetch(`/api/tiktok/pixel?projectId=${encodeURIComponent(p.id)}`, { method: "DELETE" }); const b = await readJson(r); if (!r.ok) throw new Error(b.error || "Falha ao remover.");
    setProjects(b.projects || []); setForm({ projectId: p.id, pixelCode: "", accessToken: "", testCode: "" });
  }); };

  const shown = (items || []).filter((i) => status === "ALL" || i.status === status);
  const selected = accounts.filter((a) => a.selected).length;
  const currentProject = projects.find((p) => p.id === form.projectId);

  return (
    <div className="grid gap-5">
      {error && <p role="alert" className="rounded-lg border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-600">{error}</p>}
      {ok && <p role="status" className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm text-emerald-700">{ok}</p>}

      <section className="metric-card min-w-0 rounded-xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Campanhas TikTok</h2>
          <div className="flex flex-wrap gap-2">
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="dashboard-input h-10" aria-label="Período">{PERIODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="dashboard-input h-10" aria-label="Status"><option value="ACTIVE">Ativas</option><option value="PAUSED">Pausadas</option><option value="ALL">Todas</option></select>
            <Button variant="outline" className="h-10" disabled={loading} onClick={() => loadCampaigns(period)}>{loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}Atualizar</Button>
          </div>
        </div>
        {totals && <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[["Gasto", brl(totals.spend)], ["Faturamento", brl(totals.revenue)], ["Lucro", brl(totals.profit)], ["ROAS", totals.roas == null ? "—" : totals.roas.toLocaleString("pt-BR", { maximumFractionDigits: 2 })], ["Vendas (campanhas)", num(totals.sales)], ["Vendas do TikTok", `${num(totals.tiktokSales)} · ${brl(totals.tiktokRevenue)}`]].map(([l, v]) => (
            <div key={l} className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-slate-500">{l}</p><p className={`mt-1 text-sm font-semibold tabular-nums sm:text-base ${l === "Lucro" ? (totals.profit >= 0 ? "text-emerald-500" : "text-red-500") : ""}`}>{v}</p></div>
          ))}
        </div>}
        {failures.map((f) => <p key={f.account} className="mt-3 text-sm text-amber-600">{f.account}: {f.error}</p>)}
        {!selected ? <p className="mt-4 rounded-lg border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">Conecte e vincule uma conta de anúncios do TikTok abaixo para ver as campanhas.</p>
          : items === null || (loading && !items.length) ? <div className="mt-4 flex items-center justify-center gap-2 p-6 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" />Carregando…</div>
          : !shown.length ? <p className="mt-4 rounded-lg border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">Nenhuma campanha {status === "ACTIVE" ? "ativa " : ""}no período.</p>
          : <div className="mt-4 overflow-x-auto overscroll-x-contain rounded-lg border border-border">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-muted/50 text-left text-xs text-slate-500"><tr>{["Campanha", "Gasto", "Faturamento", "Lucro", "ROAS", "Vendas", "CPA", "ICs", "Visitas", "Cliques", "CPC", "Impressões"].map((h, i) => <th key={h} className={`whitespace-nowrap px-3 py-2.5 font-medium ${i ? "text-right" : "sticky left-0 z-10 bg-card"}`}>{h}</th>)}</tr></thead>
              <tbody>{shown.map((i) => (
                <tr key={i.id} className="border-t border-border">
                  <td className="sticky left-0 z-10 max-w-[220px] bg-card px-3 py-2.5"><p className="truncate font-medium" title={i.name}>{i.name}</p><p className="truncate text-xs text-slate-500">{i.status === "ACTIVE" ? "Ativa" : "Pausada"} · {i.account}</p></td>
                  <td className="px-3 text-right tabular-nums">{brl(i.spend)}</td>
                  <td className="px-3 text-right tabular-nums">{brl(i.revenue)}</td>
                  <td className={`px-3 text-right font-semibold tabular-nums ${i.profit >= 0 ? "text-emerald-500" : "text-red-500"}`}>{brl(i.profit)}</td>
                  <td className="px-3 text-right tabular-nums">{i.roas == null ? "—" : i.roas.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</td>
                  <td className="px-3 text-right tabular-nums">{i.sales}{i.pendingSales ? <span className="text-xs text-amber-500"> +{i.pendingSales} pend.</span> : null}</td>
                  <td className="px-3 text-right tabular-nums">{i.cpa == null ? "—" : brl(i.cpa)}</td>
                  <td className="px-3 text-right tabular-nums">{num(i.checkouts)}</td>
                  <td className="px-3 text-right tabular-nums">{num(i.pageViews)}</td>
                  <td className="px-3 text-right tabular-nums">{num(i.clicks)}</td>
                  <td className="px-3 text-right tabular-nums">{i.cpc == null ? "—" : brl(i.cpc)}</td>
                  <td className="px-3 text-right tabular-nums">{num(i.impressions)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>}
        <div className="mt-4 rounded-lg bg-muted/50 p-3">
          <p className="text-sm font-medium">Parâmetros de URL do anúncio (obrigatório para casar vendas com campanha)</p>
          <p className="mt-1 text-xs text-slate-500">No TikTok Ads, em cada anúncio, cole em “Parâmetros de URL” / final da URL de destino:</p>
          <p className="mt-2 select-all break-all rounded bg-background/60 p-2 font-mono text-xs">{UTM}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => copy(UTM, "utm")}>{copied === "utm" ? <Check /> : <Copy />}{copied === "utm" ? "Copiado" : "Copiar parâmetros"}</Button>
        </div>
      </section>

      <section className="metric-card rounded-xl p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Conta de anúncios TikTok</h2>
        {!configured && <p className="mt-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700">A conexão com o TikTok ainda não está ativa no servidor (falta TIKTOK_APP_ID e TIKTOK_APP_SECRET).</p>}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button asChild={configured} disabled={!configured} className="h-11">{configured ? <a href="/api/tiktok/oauth/start"><ExternalLink />{accounts.length ? "Conectar outra conta TikTok" : "Conectar TikTok Ads"}</a> : <span><ExternalLink />Conexão indisponível</span>}</Button>
          {accounts.length > 0 && <Button variant="outline" className="h-11 text-red-600" disabled={busy === "remove"} onClick={removeAll}><Trash2 />Desconectar TikTok</Button>}
        </div>
        <div className="mt-4 rounded-xl border border-border p-4">
          <h3 className="font-semibold">Multilogin (AdsPower)</h3>
          <p className="mt-1 text-sm text-muted-foreground">Gere o link, cole no perfil do AdsPower e entre no TikTok desse perfil. A conta conecta aqui <b className="text-foreground">sem login da GhostScale e sem cookie</b> no perfil.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button className="min-h-11" disabled={busy === "link" || !configured} onClick={link ? () => copy(link.tiktokUrl, "link") : makeLink}>{busy === "link" ? <Loader2 className="animate-spin" /> : copied === "link" ? <Check /> : <Copy />}{copied === "link" ? "Link copiado" : link ? "Copiar link" : "Gerar link de conexão"}</Button>
            {link && <Button variant="outline" className="min-h-11" disabled={busy === "link"} onClick={makeLink}><RefreshCw />Gerar novo</Button>}
          </div>
          {link && <><p className="mt-3 select-all break-all rounded-lg bg-muted/50 p-3 font-mono text-xs text-muted-foreground">{link.tiktokUrl}</p><p className="mt-2 text-xs text-muted-foreground">Vale até {new Date(link.expiresAt * 1000).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}, serve para vários perfis e cancela o link anterior (inclusive o da Meta). Não compartilhe.</p></>}
        </div>
        {accounts.length > 0 && <div className="mt-4 grid gap-2">{accounts.map((a) => (
          <div key={a.advertiserId} className={`flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between ${a.selected ? "border-violet-400/60 bg-violet-500/10" : "border-border"}`}>
            <div className="min-w-0"><p className="flex flex-wrap items-center gap-2 font-medium"><span className="break-words">{a.name}</span>{a.selected && <span className="inline-flex items-center gap-1 text-sm text-emerald-600"><CheckCircle2 className="size-4" />Vinculada</span>}</p><p className="text-xs text-slate-500">ID {a.advertiserId}{a.currency ? ` · ${a.currency}` : ""}{a.timezone ? ` · ${a.timezone}` : ""}</p></div>
            <Button className="h-11 sm:w-auto" variant={a.selected ? "outline" : "default"} disabled={Boolean(busy)} onClick={() => toggle(a)}>{busy === a.advertiserId && <Loader2 className="animate-spin" />}{a.selected ? "Desvincular" : "Vincular"}</Button>
          </div>
        ))}</div>}
      </section>

      <section className="metric-card rounded-xl p-4 sm:p-5">
        <h2 className="text-lg font-semibold">Pixel TikTok + Events API</h2>
        <p className="mt-1 text-sm text-slate-500">Com isso o script da GhostScale carrega o Pixel TikTok sozinho (não instale outro), e IC, checkout e <b className="text-foreground">venda aprovada</b> vão também pelo servidor, com o mesmo ID para o TikTok não contar duas vezes.</p>
        {projects.length === 0 ? <p className="mt-3 text-sm text-slate-500">Crie um projeto em Integrações primeiro.</p> : <form onSubmit={savePixel} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">Projeto<select className="dashboard-input h-10" value={form.projectId} onChange={(e) => { const p = projects.find((x) => x.id === e.target.value); setForm({ projectId: e.target.value, pixelCode: p?.pixelCode || "", accessToken: "", testCode: p?.testCode || "" }); }}>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}{p.pixelCode ? " · TikTok ativo" : ""}</option>)}</select></label>
          <label className="grid gap-1 text-sm">Código do Pixel<input className="dashboard-input h-10" value={form.pixelCode} onChange={(e) => setForm({ ...form, pixelCode: e.target.value.trim().toUpperCase() })} placeholder="Ex.: CQ1ABC2DEF3GH4IJ5KL6" autoComplete="off" /></label>
          <label className="grid gap-1 text-sm">Token de acesso (Events API)<input className="dashboard-input h-10" type="password" value={form.accessToken} onChange={(e) => setForm({ ...form, accessToken: e.target.value })} placeholder={currentProject?.hasToken ? "Salvo · cole outro para trocar" : "Cole o token"} autoComplete="off" spellCheck={false} /></label>
          <label className="grid gap-1 text-sm">Código de teste (opcional)<input className="dashboard-input h-10" value={form.testCode} onChange={(e) => setForm({ ...form, testCode: e.target.value.trim() })} placeholder="TEST12345" autoComplete="off" /></label>
          <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row">
            <Button type="submit" className="h-11" disabled={busy === "pixel" || !form.pixelCode}>{busy === "pixel" && <Loader2 className="animate-spin" />}Salvar Pixel TikTok</Button>
            {currentProject?.pixelCode && <Button type="button" variant="outline" className="h-11 text-red-600" disabled={busy === "pixel"} onClick={() => removePixel(currentProject)}><Trash2 />Remover do projeto</Button>}
          </div>
          <p className="text-xs text-slate-500 sm:col-span-2">O código e o token ficam no TikTok Ads em Ferramentas → Gerenciador de eventos → seu pixel → Configurações → “Gerar token de acesso”. Apague o código de teste depois de conferir os eventos.</p>
        </form>}
      </section>
    </div>
  );
}
