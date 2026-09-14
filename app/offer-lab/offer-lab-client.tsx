"use client";
import { useToolState, ToolSaveBar } from "@/components/use-tool-state";
import { useState } from "react";
import { FlaskConical, Plus, Trash2 } from "lucide-react";
import { parsePrice } from "@/lib/tool-state";
import { uid } from "@/lib/uid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Offer = { id: string; name: string; price: number; hook: string; status: string };

export function OfferLabClient() {
  const store = useToolState<Offer[]>("offer_lab", []);
  const { data: offers, setData: setOffers } = store;
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [hook, setHook] = useState("");
  const [formError, setFormError] = useState("");
  const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number.isFinite(v) ? v : 0);
  function add(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!name.trim()) { setFormError("Dê um nome para a variação."); return; }
    const value = parsePrice(price);
    if (!Number.isFinite(value) || value <= 0) { setFormError("Informe um preço válido maior que zero."); return; }
    setOffers((o) => [...o, { id: uid(), name: name.trim().slice(0, 80), price: Math.round(value * 100) / 100, hook: hook.trim().slice(0, 140), status: "em teste" }]);
    setName(""); setPrice(""); setHook("");
  }
  return (
    <><ToolSaveBar state={store} /><fieldset disabled={store.loading || store.saving || !store.canEdit} className="min-w-0">
    <div className="grid gap-4">
      <Card className="metric-card">
        <CardHeader><CardTitle className="flex items-center gap-2"><FlaskConical className="size-5 text-violet-300" />Offer Lab — teste de ofertas</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid gap-2 md:grid-cols-[1fr_140px_1fr_auto]">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da oferta/variação" className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm" />
            <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Preço R$" inputMode="decimal" className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm" />
            <input value={hook} onChange={(e) => setHook(e.target.value)} placeholder="Hook principal" className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm" />
            <Button type="submit" size="sm"><Plus className="size-4" />Adicionar</Button>
          </form>
          {formError ? <p role="alert" className="mt-2 text-sm text-red-400">{formError}</p> : null}
          <p className="mt-3 text-xs text-slate-500">Organize as variações e marque a vencedora após analisar seus dados. Salvar aqui não altera a oferta publicada.</p>
        </CardContent>
      </Card>
      <div className="grid gap-3">
        {offers.length ? offers.map((o) => (
          <div key={o.id} className="metric-card flex items-center justify-between gap-3 rounded-xl p-4">
            <div><b className="text-sm">{o.name} · {brl(o.price)}</b><p className="mt-1 text-xs text-slate-500">{o.hook || "Sem hook"} · {o.status}</p></div>
            <div className="flex gap-2">
              <button onClick={() => setOffers((l) => l.map((x) => x.id === o.id ? { ...x, status: x.status === "vencedora" ? "em teste" : "vencedora" } : x))} className="rounded-full bg-violet-500/15 px-3 py-1 text-xs text-violet-200">{o.status === "vencedora" ? "★ vencedora" : "marcar vencedora"}</button>
              <button onClick={() => setOffers((l) => l.filter((x) => x.id !== o.id))} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-red-300"><Trash2 className="size-4" /></button>
            </div>
          </div>
        )) : <div className="metric-card rounded-xl p-8 text-center text-sm text-slate-500">Nenhuma oferta em teste. Adicione a primeira variação acima.</div>}
      </div>
    </div>
    </fieldset></>
  );
}
