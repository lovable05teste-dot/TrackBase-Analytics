"use client";
import { useEffect, useState } from "react";
import { Bot, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Rule = { id: string; name: string; condition: string; action: string; active: boolean };
const KEY = "tb_agent_hub_rules";
const PRESETS: Omit<Rule, "id" | "active">[] = [
  { name: "Alerta CPA alto", condition: "CPA > R$ 60 em 3 dias", action: "Notificar + sugerir pausar conjunto" },
  { name: "Escalar ROAS", condition: "ROAS > 2.5 em 7 dias", action: "Sugerir +20% orçamento" },
  { name: "Checkout travado", condition: "IC→compra < 15%", action: "Abrir checklist de checkout" },
  { name: "Tráfego inválido", condition: ">30% cliques sem PageView", action: "Ativar Blacklist + Anti-Clone" },
];

export function AgentHubClient() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [name, setName] = useState("");
  useEffect(() => {
    try { setRules(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { setRules([]); }
  }, []);
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(rules)); }, [rules]);
  function addPreset(p: (typeof PRESETS)[number]) {
    setRules((r) => [...r, { ...p, id: crypto.randomUUID(), active: true }]);
  }
  function addCustom(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setRules((r) => [...r, { id: crypto.randomUUID(), name: name.trim(), condition: "Manual", action: "Monitorar no dashboard", active: true }]);
    setName("");
  }
  return (
    <div className="grid gap-4">
      <Card className="metric-card">
        <CardHeader><CardTitle className="flex items-center gap-2"><Bot className="size-5 text-violet-300" />Agentes de otimização</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-slate-400">Ative agentes que vigiam o funil e sugerem ações. As regras ficam salvas neste navegador.</p>
          <div className="flex flex-wrap gap-2">
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
              <button onClick={() => setRules((list) => list.map((x) => x.id === r.id ? { ...x, active: !x.active } : x))} className={`rounded-full px-3 py-1 text-xs ${r.active ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-slate-400"}`}>{r.active ? "Ativo" : "Pausado"}</button>
              <button onClick={() => setRules((list) => list.filter((x) => x.id !== r.id))} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-red-300" aria-label="Remover"><Trash2 className="size-4" /></button>
            </div>
          </div>
        )) : <div className="metric-card rounded-xl p-8 text-center text-sm text-slate-500">Nenhum agente ativo. Adicione um preset acima.</div>}
      </div>
    </div>
  );
}
