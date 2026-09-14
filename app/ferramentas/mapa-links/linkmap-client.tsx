"use client";
import { useToolState, ToolSaveBar } from "@/components/use-tool-state";
import { useState } from "react";
import { Link2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type L = { id: string; label: string; url: string };

export function LinkMapClient() {
  const store = useToolState<L[]>("mapa_links", []);
  const { data: links, setData: setLinks } = store;
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!label.trim() || !url.trim()) { setError("Preencha o nome e a URL."); return; }
    try { const u = new URL(url); if (!["http:", "https:"].includes(u.protocol) || u.username || u.password) throw new Error(); } catch { setError("Use uma URL HTTP ou HTTPS completa, sem senha."); return; }
    setLinks((l) => [...l, { id: crypto.randomUUID(), label: label.trim(), url: url.trim() }]);
    setLabel(""); setUrl("");
  }
  return (
    <><ToolSaveBar state={store} /><fieldset disabled={store.loading || store.saving || !store.canEdit} className="min-w-0">
    <Card className="metric-card">
      <CardHeader><CardTitle className="flex items-center gap-2"><Link2 className="size-5 text-violet-300" />Mapa de Links</CardTitle></CardHeader>
      <CardContent>
        {error && <p role="alert" className="mb-3 text-sm text-red-500">{error}</p>}
        <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: Checkout Pix" className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm sm:w-52" />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm" />
          <Button type="submit" size="sm"><Plus className="size-4" />Adicionar</Button>
        </form>
        <div className="mt-4 space-y-2">
          {links.length ? links.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/[.03] p-3 text-sm"><span><a href={l.url} target="_blank" rel="noreferrer" className="font-semibold underline">{l.label}</a> <span className="block max-w-[420px] truncate text-xs text-slate-500">{l.url}</span></span><button onClick={() => setLinks((x) => x.filter((y) => y.id !== l.id))} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-red-300"><Trash2 className="size-4" /></button></div>
          )) : <p className="py-4 text-center text-sm text-slate-500">Mapeie página, checkout, upsell e suporte para auditoria rápida.</p>}
        </div>
      </CardContent>
    </Card>
    </fieldset></>
  );
}
