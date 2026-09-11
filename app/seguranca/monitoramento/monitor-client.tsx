"use client";
import { useEffect, useState } from "react";
import { Activity, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uid } from "@/lib/uid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Site = { id: string; url: string; status: string; ms: number | null; checkedAt: string | null };
const KEY = "tb_monitored_sites";

export function MonitorClient() {
  const [sites, setSites] = useState<Site[]>([]);
  const [url, setUrl] = useState("");
  const [checking, setChecking] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSites(JSON.parse(raw));
    } catch { /* mantém vazio */ } finally { setReady(true); }
  }, []);
  useEffect(() => { if (!ready) return; try { localStorage.setItem(KEY, JSON.stringify(sites)); } catch { /* sem persistência */ } }, [sites, ready]);

  async function checkOne(s: Site): Promise<Site> {
    const t0 = performance.now();
    try {
      // Verificação básica de alcance: no-cors não expõe o HTTP status,
      // então "alcançável" = o host respondeu; "sem resposta" = DNS/rede falhou
      await fetch(s.url, { mode: "no-cors", cache: "no-store" });
      return { ...s, status: "alcançável", ms: Math.round(performance.now() - t0), checkedAt: new Date().toLocaleString("pt-BR") };
    } catch {
      return { ...s, status: "sem resposta", ms: null, checkedAt: new Date().toLocaleString("pt-BR") };
    }
  }

  async function checkAll() {
    setChecking(true);
    const out: Site[] = [];
    for (const s of sites) out.push(await checkOne(s));
    setSites(out);
    setChecking(false);
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    let v = url.trim();
    if (!v) return;
    if (!/^https?:\/\//i.test(v)) v = "https://" + v;
    try {
      const host = new URL(v).hostname;
      if (!host.includes(".")) return;
    } catch { return; }
    if (sites.some((s) => s.url.toLowerCase() === v.toLowerCase())) return;
    setSites((l) => [...l, { id: uid(), url: v, status: "não verificado", ms: null, checkedAt: null }]);
    setUrl("");
  }

  return (
    <div className="grid gap-4">
      <Card className="metric-card">
        <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="size-5 text-emerald-300" />Monitoramento de Sites</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={add} className="flex gap-2">
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://sua-pagina.com" className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm" />
            <Button type="submit" size="sm"><Plus className="size-4" />Adicionar</Button>
          </form>
          <Button variant="outline" size="sm" className="mt-3" onClick={checkAll} disabled={checking || !sites.length}>{checking ? "Verificando..." : "Verificar agora"}</Button>
          <p className="mt-2 text-xs text-slate-500">Verificação básica de alcance: “alcançável” indica que o host respondeu (não valida o código HTTP).</p>
        </CardContent>
      </Card>
      <div className="grid gap-3">
        {sites.length ? sites.map((s) => (
          <div key={s.id} className="metric-card flex items-center justify-between gap-3 rounded-xl p-4">
            <div className="min-w-0"><b className="block truncate text-sm">{s.url}</b><p className="mt-1 text-xs text-slate-500">{s.status}{s.ms != null ? ` · ${s.ms}ms` : ""}{s.checkedAt ? ` · ${s.checkedAt}` : ""}</p></div>
            <button onClick={() => setSites((l) => l.filter((x) => x.id !== s.id))} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-red-300"><Trash2 className="size-4" /></button>
          </div>
        )) : <div className="metric-card rounded-xl p-8 text-center text-sm text-slate-500">Adicione a URL da página de vendas e do checkout para monitorar.</div>}
      </div>
    </div>
  );
}
