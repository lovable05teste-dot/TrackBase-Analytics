"use client";
import { useToolState, ToolSaveBar } from "@/components/use-tool-state";
import { useState } from "react";
import { Bot, Plus, Trash2 } from "lucide-react";
import { uid } from "@/lib/uid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Rule = { id: string; name: string; condition: string; action: string; active: boolean };
const PRESETS: Omit<Rule, "id" | "active">[] = [
  { name: "Alerta CPA alto", condition: "CPA > R$ 60 em 3 dias", action: "Notificar + sugerir pausar conjunto" },
  { name: "Escalar ROAS", condition: "ROAS > 2.5 em 7 dias", action: "Sugerir +20% orçamento" },
  { name: "Checkout travado", condition: "IC→compra < 15%", action: "Abrir checklist de checkout" },
  { name: "Tráfego inválido", condition: ">30% cliques sem PageView", action: "Revisar origem dos cliques no relatório de tráfego" },
];

export function AgentHubClient() {
  const store = useToolState<Rule[]>("agent_hub", []);
  const { data: rules, setData: setRules } = store;
  const [name, setName] = useState("");
  function addPreset(p: (typeof PRESETS)[number]) {
    setRules((r) => [...r, { ...p, id: uid(), active: true }]);
  }
  function addCustom(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setRules((r) => [...r, { id: uid(), name: name.trim(), condition: "Manual", action: "Monitorar no dashboard", active: true }]);
    setName("");
  }
  return (
    <><ToolSaveBar state={store} /><fieldset disabled={store.loading || store.saving || !store.canEdit} className="min-w-0">
    <div className="grid gap-4">
      <Card className="metric-card">
        <CardHeader><CardTitle className="flex items-center gap-2"><Bot className="size-5 text-violet-300" />Modelos de automação</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-slate-400">Organize modelos na sua conta. Estes cartões são rascunhos; para executar regras de campanha, configure condições e ações no Meta Lab.</p>
          <a href="/meta-lab" className="mb-4 inline-block text-sm text-red-500 underline">Configurar regras executáveis no Meta Lab →</a><div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => <Button key={p.name} variant="outline" size="sm" onClick={() => addPreset(p)}><Plus className="size-3.5" />{p.name}</Button>)}
          </div>
          <form onSubmit={addCustom} className="mt-4 flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Vigiar campanha X" className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm" />
            <Button type="submit" size="sm">Adicionar</Button>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-3">
        {rules.length ? rules.map((r) => (
          <div key={r.id} className="metric-card flex items-center justify-between gap-3 rounded-xl p-4">
            <div><b className="text-sm">{r.name}</b><p className="mt-1 text-xs text-slate-500">Se {r.condition} → {r.action}</p></div>
            <div className="flex items-center gap-2">
              <button onClick={() => setRules((list) => list.map((x) => x.id === r.id ? { ...x, active: !x.active } : x))} className={`rounded-full px-3 py-1 text-xs ${r.active ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-slate-400"}`}>{r.active ? "Rascunho" : "Arquivado"}</button>
              <button onClick={() => setRules((list) => list.filter((x) => x.id !== r.id))} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-red-300" aria-label="Remover"><Trash2 className="size-4" /></button>
            </div>
          </div>
        )) : <div className="metric-card rounded-xl p-8 text-center text-sm text-slate-500">Nenhum modelo salvo. Adicione um modelo acima.</div>}
      </div>
    </div>
    </fieldset></>
  );
}
