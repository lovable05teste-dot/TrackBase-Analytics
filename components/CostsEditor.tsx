"use client";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/plan-client";
import type { Costs } from "@/lib/costs";

const money = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const FIELDS: { key: keyof Costs; label: string; suffix: string; hint: string }[] = [
  { key: "productCostPct", label: "Custo do produto", suffix: "%", hint: "Sobre o faturamento" },
  { key: "gatewayFeePct", label: "Taxa do gateway", suffix: "%", hint: "Sobre o faturamento" },
  { key: "gatewayFeeFixed", label: "Taxa fixa por venda", suffix: "R$", hint: "Por venda aprovada" },
  { key: "taxPct", label: "Impostos", suffix: "%", hint: "Sobre o faturamento" },
  { key: "otherMonthly", label: "Despesas fixas por mês", suffix: "R$", hint: "Ferramentas, equipe… rateado por dia" },
];

// Formulário dos custos da operação (salvo em /api/tools/state?tool=custos).
// `breakdown` = valores já calculados para o período do Dashboard.
export function CostsEditor({ costs, revision, onSaved, breakdown }: { costs: Costs; revision: number; onSaved: (c: Costs, revision: number) => void; breakdown: { product: number; gateway: number; tax: number; other: number; total: number } }) {
  const [draft, setDraft] = useState<Record<keyof Costs, string>>(() => Object.fromEntries(FIELDS.map((f) => [f.key, costs[f.key] ? String(costs[f.key]).replace(".", ",") : ""])) as Record<keyof Costs, string>);
  const [saving, setSaving] = useState(false), [msg, setMsg] = useState("");
  const parse = (v: string) => { const n = Number(v.replace(/\./g, "").replace(",", ".")); return Number.isFinite(n) && n > 0 ? n : 0; };
  const save = async () => {
    setSaving(true); setMsg("");
    const data = Object.fromEntries(FIELDS.map((f) => [f.key, parse(draft[f.key])])) as Costs;
    try {
      const r = await apiFetch("/api/tools/state?tool=custos", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ data, revision }) });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error || "Não foi possível salvar.");
      onSaved(b.data, b.revision); setMsg("Custos salvos. O lucro já considera os novos valores.");
    } catch (e) { setMsg(e instanceof Error ? e.message : "Não foi possível salvar."); } finally { setSaving(false); }
  };
  const lines: [string, number][] = [["Custo do produto", breakdown.product], ["Taxas do gateway", breakdown.gateway], ["Impostos", breakdown.tax], ["Despesas fixas (período)", breakdown.other]];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className="text-sm">
            <span className="font-medium">{f.label}</span>
            <div className="mt-1 flex items-center gap-2"><input inputMode="decimal" className="dashboard-input h-10 w-full" value={draft[f.key]} onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))} placeholder="0" aria-label={f.label} /><span className="w-6 text-xs text-slate-500">{f.suffix}</span></div>
            <span className="text-[11px] text-slate-500">{f.hint}</span>
          </label>
        ))}
      </div>
      <Button className="h-10" disabled={saving} onClick={save}>{saving ? <Loader2 className="animate-spin" /> : <Save />}Salvar custos</Button>
      {msg && <p role="status" className="text-sm text-slate-500">{msg}</p>}
      <ul className="space-y-1.5 border-t border-slate-200 pt-3 text-sm">
        {lines.map(([label, v]) => <li key={label} className="flex justify-between"><span className="text-slate-500">{label}</span><span className="tabular-nums">{money(v)}</span></li>)}
        <li className="flex justify-between font-semibold"><span>Total de custos no período</span><span className="tabular-nums">{money(breakdown.total)}</span></li>
      </ul>
    </div>
  );
}
