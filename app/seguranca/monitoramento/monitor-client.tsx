"use client";
import { useToolState, ToolSaveBar } from "@/components/use-tool-state";
import { useState } from "react";
import { Activity, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uid } from "@/lib/uid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Site = { id: string; url: string; status: string; ms: number | null; checkedAt: string | null };

export function MonitorClient() {
  const store = useToolState<Site[]>("monitoramento", []);
  const { data: sites, setData: setSites } = store;
  const [url, setUrl] = useState("");
  const [checking, setChecking] = useState(false);
  const [formError, setFormError] = useState("");

  async function checkOne(s: Site): Promise<Site> {
    const t0 = performance.now();
    try {
      // Verificação básica de alcance: no-cors não expõe o HTTP status,
      // então "alcançável" = o host respondeu; "sem resposta" = DNS/rede falhou
      await fetch(s.url, { mode: "no-cors", cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer", signal: AbortSignal.timeout(8000) });
      return { ...s, status: "alcançável", ms: Math.round(performance.now() - t0), checkedAt: new Date().toLocaleString("pt-BR") };
    } catch {
      return { ...s, status: "sem resposta", ms: null, checkedAt: new Date().toLocaleString("pt-BR") };
    }
  }

  async function checkAll() {
    setChecking(true);
    const out: Site[] = [];
    for (let i = 0; i < sites.length; i += 3) out.push(...await Promise.all(sites.slice(i, i + 3).map(checkOne)));
    setSites(out);
    setChecking(false);
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (sites.length >= 30) { setFormError("Limite de 30 endereços por conta."); return; }
    let v = url.trim();
    if (!v) return;
    if (!/^https?:\/\//i.test(v)) v = "https://" + v;
    try {
      const parsed = new URL(v), host = parsed.hostname;
      if (!host.includes(".") || !["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error();
    } catch { setFormError("Informe uma URL HTTP ou HTTPS válida, sem senha."); return; }
    if (sites.some((s) => s.url.toLowerCase() === v.toLowerCase())) return;
    setSites((l) => [...l, { id: uid(), url: v, status: "não verificado", ms: null, checkedAt: null }]);
    setUrl("");
  }

  return (
    <><ToolSaveBar state={{ ...store, saving: store.saving || checking }} /><fieldset disabled={store.loading || store.saving || !store.canEdit || checking} className="min-w-0">
    <div className="grid gap-4">
      <Card className="metric-card">
        <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="size-5 text-emerald-300" />Monitoramento de Sites</CardTitle></CardHeader>
        <CardContent>
          {formError && <p role="alert" className="mb-3 text-sm text-red-500">{formError}</p>}
          <form onSubmit={add} className="flex gap-2">
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://sua-pagina.com" className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm" />
            <Button type="submit" size="sm"><Plus className="size-4" />Adicionar</Button>
          </form>
          <Button variant="outline" size="sm" className="mt-3" onClick={checkAll} disabled={checking || !sites.length}>{checking ? "Verificando..." : "Verificar agora"}</Button>
          <p className="mt-2 text-xs text-slate-500">Verificação manual pelo seu navegador, com limite de 8 segundos por URL. “Alcançável” não confirma HTTP 200 nem venda funcionando. Salve para guardar os resultados; não há monitoramento em segundo plano.</p>
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
    </fieldset></>
  );
}
