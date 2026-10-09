"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Activity, BellRing, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/plan-client";

type Monitor = { id: string; url: string; keyword: string | null; status: string; code: number | null; ms: number | null; error: string | null; checkedAt: number | null; downSince: number | null; uptime24h: number | null; checks24h: number; recent: { at: number; ok: number; ms: number | null }[] };

const STATUS: Record<string, { label: string; dot: string; text: string }> = {
  up: { label: "No ar", dot: "bg-emerald-500", text: "text-emerald-500" },
  down: { label: "Fora do ar", dot: "bg-red-500", text: "text-red-500" },
  unknown: { label: "Verificando…", dot: "bg-slate-400", text: "text-slate-400" },
};

function ago(ts: number | null) {
  if (!ts) return "nunca";
  const s = Math.max(0, Math.floor(Date.now() / 1000) - ts);
  if (s < 60) return "agora há pouco";
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  return `há ${Math.floor(s / 86400)} dia(s)`;
}

// Últimas verificações (24 h) em barrinhas: verde ok, vermelho falha.
function History({ recent }: { recent: Monitor["recent"] }) {
  if (!recent.length) return null;
  return (
    <div className="mt-3 flex h-6 items-end gap-[2px]" aria-label="Histórico das últimas verificações">
      {recent.map((r) => <span key={r.at} title={`${new Date(r.at * 1000).toLocaleString("pt-BR")} · ${r.ok ? "no ar" : "falha"}${r.ms != null ? ` · ${r.ms} ms` : ""}`} className={`w-1.5 flex-1 rounded-sm ${r.ok ? "h-full bg-emerald-500/70" : "h-full bg-red-500"}`} style={{ maxWidth: 8 }} />)}
    </div>
  );
}

export function MonitorClient() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [canEdit, setCanEdit] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [url, setUrl] = useState("");
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/monitors", { cache: "no-store" });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error || "Não foi possível carregar.");
      setMonitors(b.monitors || []);
      setCanEdit(b.canEdit !== false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const first = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => { if (!document.hidden) void load(); }, 60000);
    return () => { window.clearTimeout(first); window.clearInterval(timer); };
  }, [load]);

  async function call(path: string, init: RequestInit, tag: string) {
    setBusy(tag);
    setError("");
    try {
      const r = await apiFetch(path, init);
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error || "Não foi possível concluir.");
      setMonitors(b.monitors || []);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível concluir.");
      return false;
    } finally {
      setBusy("");
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    if (await call("/api/monitors", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url, keyword }) }, "add")) {
      setUrl("");
      setKeyword("");
    }
  }

  const down = monitors.filter((m) => m.status === "down").length;

  return (
    <div className="grid gap-4">
      <Card className="metric-card">
        <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="size-5 text-emerald-400" />Monitoramento automático</CardTitle></CardHeader>
        <CardContent>
          <ul className="grid gap-1.5 text-sm text-slate-500">
            <li>• O servidor da GhostScale verifica cada endereço a cada <b className="text-foreground">5 minutos</b>, mesmo com o app fechado.</li>
            <li>• Confere a resposta real da página (código HTTP) e o tempo de carregamento.</li>
            <li>• <BellRing className="inline size-3.5" /> Avisa no celular quando a página <b className="text-foreground">cair</b> e quando <b className="text-foreground">voltar</b>. Ative as notificações no sino.</li>
          </ul>
          {!canEdit && <p className="mt-3 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-600">Seu plano não inclui o Monitoramento de Sites. <Link href="/planos" className="font-semibold underline">Ver planos</Link></p>}
          <form onSubmit={add} className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,220px)_auto]">
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://sua-pagina.com/oferta" className="dashboard-input" aria-label="URL a monitorar" disabled={!canEdit} />
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Texto que deve aparecer (opcional)" className="dashboard-input" aria-label="Texto que deve aparecer na página" disabled={!canEdit} />
            <Button type="submit" disabled={!canEdit || busy === "add" || !url.trim()} className="h-10">{busy === "add" ? <Loader2 className="animate-spin" /> : <Plus />}Monitorar</Button>
          </form>
          <p className="mt-2 text-xs text-slate-500">Dica: monitore a página de vendas e o checkout. O texto opcional (ex.: “Comprar agora”) confirma que a página carregou de verdade, e não uma página de erro.</p>
          {error && <p role="alert" className="mt-3 text-sm text-red-500">{error}</p>}
        </CardContent>
      </Card>

      {monitors.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">{monitors.length} endereço(s) · {down ? <b className="text-red-500">{down} fora do ar</b> : <span className="text-emerald-500">todos no ar</span>}</p>
          <Button variant="outline" size="sm" disabled={!canEdit || busy === "check"} onClick={() => call("/api/monitors?action=check", { method: "POST" }, "check")}>{busy === "check" ? <Loader2 className="animate-spin" /> : <RefreshCw />}Verificar agora</Button>
        </div>
      )}

      <div className="grid gap-3">
        {loading ? (
          <div className="metric-card flex items-center justify-center gap-2 rounded-xl p-8 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" />Carregando…</div>
        ) : monitors.length ? monitors.map((m) => {
          const st = STATUS[m.status] || STATUS.unknown;
          return (
            <div key={m.id} className={`metric-card rounded-xl p-4 ${m.status === "down" ? "border-red-500/40" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={`flex items-center gap-2 text-sm font-semibold ${st.text}`}><span className={`size-2.5 shrink-0 rounded-full ${st.dot} ${m.status === "up" ? "animate-pulse" : ""}`} />{st.label}{m.status === "down" && m.downSince ? <span className="font-normal text-slate-500">caiu {ago(m.downSince)}</span> : null}</p>
                  <a href={m.url} target="_blank" rel="noreferrer" className="mt-1 block break-all text-sm font-medium hover:underline">{m.url}</a>
                  {m.keyword && <p className="mt-0.5 text-xs text-slate-500">Confere o texto “{m.keyword}”</p>}
                </div>
                <button type="button" disabled={!canEdit || busy === m.id} onClick={() => { if (confirm(`Parar de monitorar ${m.url}?`)) void call(`/api/monitors?id=${encodeURIComponent(m.id)}`, { method: "DELETE" }, m.id); }} aria-label={`Remover ${m.url}`} className="shrink-0 rounded-lg border border-border p-2 text-slate-400 hover:text-red-400 disabled:opacity-50"><Trash2 className="size-4" /></button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-muted/50 p-2"><p className="text-slate-500">Uptime 24 h</p><p className="mt-0.5 text-sm font-semibold tabular-nums">{m.uptime24h == null ? "—" : `${m.uptime24h.toLocaleString("pt-BR")}%`}</p></div>
                <div className="rounded-lg bg-muted/50 p-2"><p className="text-slate-500">Resposta</p><p className="mt-0.5 text-sm font-semibold tabular-nums">{m.ms == null ? "—" : `${(m.ms / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} s`}</p></div>
                <div className="rounded-lg bg-muted/50 p-2"><p className="text-slate-500">Código</p><p className="mt-0.5 text-sm font-semibold tabular-nums">{m.code ?? "—"}</p></div>
              </div>
              {m.error && m.status !== "up" && <p className="mt-2 text-xs text-red-500">Motivo: {m.error}</p>}
              <History recent={m.recent} />
              <p className="mt-2 text-[11px] text-slate-500">Última verificação {ago(m.checkedAt)} · {m.checks24h} verificação(ões) nas últimas 24 h</p>
            </div>
          );
        }) : (
          <div className="metric-card rounded-xl p-8 text-center text-sm text-slate-500">Adicione a URL da página de vendas e do checkout para monitorar.</div>
        )}
      </div>
    </div>
  );
}
