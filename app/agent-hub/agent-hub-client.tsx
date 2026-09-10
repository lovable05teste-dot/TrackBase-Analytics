"use client";
import { useEffect, useState } from "react";
import { Bot, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Rule = { id: string; name: string; level: string; metric: string; operator: string; value: number; windowDays: number; minSpend: number; action: string; active: boolean; cooldownHours: number; lastTriggeredAt?: number | null };
type Preset = { name: string; desc: string; payload: Omit<Rule, "id" | "active" | "lastTriggeredAt"> };

const PRESETS: Preset[] = [
  { name: "Alerta CPA alto", desc: "Campanha com CPA > R$60 em 3d → avisar", payload: { name: "Alerta CPA alto", level: "campaign", metric: "cpa", operator: ">", value: 60, windowDays: 3, minSpend: 50, action: "notify", cooldownHours: 24 } },
  { name: "Mata campanha sem ROAS", desc: "Campanha com ROAS < 1.2 em 3d → pausar", payload: { name: "Mata campanha sem ROAS", level: "campaign", metric: "roas", operator: "<", value: 1.2, windowDays: 3, minSpend: 100, action: "pause", cooldownHours: 72 } },
  { name: "Escalar vencedora", desc: "Campanha com ROAS > 2.5 em 7d → avisar", payload: { name: "Escalar vencedora", level: "campaign", metric: "roas", operator: ">", value: 2.5, windowDays: 7, minSpend: 100, action: "notify", cooldownHours: 72 } },
  { name: "Sem venda com gasto", desc: "Conjunto com 0 vendas e gasto alto em 3d → pausar", payload: { name: "Sem venda com gasto", level: "adset", metric: "sales", operator: "<", value: 1, windowDays: 3, minSpend: 80, action: "pause", cooldownHours: 48 } },
];

const ruleText = (r: Rule) => `${r.level} com ${r.metric} ${r.operator} ${r.value} em ${r.windowDays}d${r.minSpend ? ` (gasto mín R$ ${r.minSpend})` : ""} → ${r.action}`;

export function AgentHubClient() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  async function load() {
    try {
      const r = await fetch("/api/meta/rules", { cache: "no-store" });
      const v = await r.json();
      if (r.ok) setRules(v.rules || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function addPreset(p: Preset) {
    setMsg("");
    const r = await fetch("/api/meta/rules", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(p.payload) });
    const v = await r.json();
    setMsg(r.ok ? `Agente "${p.name}" ativado de verdade.` : v.error || "Falha ao ativar.");
    await load();
  }

  async function toggle(rule: Rule) {
    await fetch("/api/meta/rules", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...rule, active: !rule.active }) });
    await load();
  }

  async function remove(id: string) {
    await fetch(`/api/meta/rules?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="grid gap-4">
      <Card className="metric-card">
        <CardHeader><CardTitle className="flex items-center gap-2"><Bot className="size-5 text-violet-300" />Agentes de otimização</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-slate-400">Agentes de verdade: criam regras que o cron avalia e executam pausar/ativar/avisar na Meta. Mesmas regras do Meta Lab.</p>
          {msg && <p className="mb-3 text-sm text-emerald-300">{msg}</p>}
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => <Button key={p.name} variant="outline" size="sm" onClick={() => addPreset(p)} title={p.desc}><Plus className="size-3.5" />{p.name}</Button>)}
          </div>
          <p className="mt-3 text-xs text-slate-500">Regras personalizadas e histórico em <a href="/meta-lab" className="underline">Meta Lab</a>.</p>
        </CardContent>
      </Card>
      <div className="grid gap-3">
        {loading ? <div className="metric-card rounded-xl p-8 text-center text-sm text-slate-500">Carregando...</div>
          : rules.length ? rules.map((r) => (
            <div key={r.id} className="metric-card flex items-center justify-between gap-3 rounded-xl p-4">
              <div><b className="text-sm">{r.name}</b><p className="mt-1 text-xs text-slate-500">Se {ruleText(r)}{r.lastTriggeredAt ? ` · disparou em ${new Date(r.lastTriggeredAt * 1000).toLocaleString("pt-BR")}` : ""}</p></div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggle(r)} className={`rounded-full px-3 py-1 text-xs ${r.active ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-slate-400"}`}>{r.active ? "Ativo" : "Pausado"}</button>
                <button onClick={() => remove(r.id)} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-red-300" aria-label="Remover"><Trash2 className="size-4" /></button>
              </div>
            </div>
          )) : <div className="metric-card rounded-xl p-8 text-center text-sm text-slate-500">Nenhum agente ativo. Ative um preset acima.</div>}
      </div>
    </div>
  );
}
