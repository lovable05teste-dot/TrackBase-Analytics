"use client";
import { useEffect, useState } from "react";
import { Activity, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Site = { id: string; url: string; active: number; lastStatus: string | null; lastMs: number | null; lastCode: number | null; lastCheckedAt: number | null; consecutiveFailures: number };

export function MonitorClient() {
  const [sites, setSites] = useState<Site[]>([]);
  const [url, setUrl] = useState("");
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/monitoring/sites", { cache: "no-store" });
      const v = await r.json();
      if (!r.ok) throw new Error(v.error || "Falha ao carregar.");
      setSites(v.sites || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setError("");
    try {
      const r = await fetch("/api/monitoring/sites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
      const v = await r.json();
      if (!r.ok) throw new Error(v.error || "Falha ao adicionar.");
      setUrl("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao adicionar.");
    }
  }

  async function checkAll() {
    setChecking(true);
    try {
      await fetch("/api/cron/monitoring", { cache: "no-store" });
      await load();
    } finally {
      setChecking(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/monitoring/sites?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="grid gap-4">
      <Card className="metric-card">
        <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="size-5 text-emerald-300" />Monitoramento de Sites</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-slate-400">Checagem no servidor a cada 5 minutos + alerta push quando cair ou voltar. Não depende do seu navegador aberto.</p>
          {error && <p className="mb-3 rounded-lg border border-red-400/30 p-3 text-sm text-red-300">{error}</p>}
          <form onSubmit={add} className="flex gap-2">
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://sua-pagina.com" className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm" />
            <Button type="submit" size="sm"><Plus className="size-4" />Adicionar</Button>
          </form>
          <Button variant="outline" size="sm" className="mt-3" onClick={checkAll} disabled={checking || !sites.length}>{checking ? "Verificando..." : "Verificar agora"}</Button>
        </CardContent>
      </Card>
      <div className="grid gap-3">
        {loading ? <div className="metric-card rounded-xl p-8 text-center text-sm text-slate-500">Carregando...</div>
          : sites.length ? sites.map((s) => (
            <div key={s.id} className="metric-card flex items-center justify-between gap-3 rounded-xl p-4">
              <div className="min-w-0"><b className="block truncate text-sm">{s.url}</b><p className="mt-1 text-xs text-slate-500">{s.lastStatus || "aguardando 1ª checagem"}{s.lastMs != null ? ` · ${s.lastMs}ms` : ""}{s.lastCode ? ` · HTTP ${s.lastCode}` : ""}{s.lastCheckedAt ? ` · ${new Date(s.lastCheckedAt * 1000).toLocaleString("pt-BR")}` : ""}{s.consecutiveFailures > 0 ? ` · ${s.consecutiveFailures} falha(s)` : ""}</p></div>
              <button onClick={() => remove(s.id)} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-red-300"><Trash2 className="size-4" /></button>
            </div>
          )) : <div className="metric-card rounded-xl p-8 text-center text-sm text-slate-500">Adicione a URL da página de vendas e do checkout para monitorar.</div>}
      </div>
    </div>
  );
}
