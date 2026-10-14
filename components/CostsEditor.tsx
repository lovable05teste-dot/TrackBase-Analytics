"use client";
import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/plan-client";
import type { GatewayRates, Costs } from "@/lib/costs";

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
export function CostsEditor({ costs, rates, revision, onSaved, breakdown }: { costs: Costs; rates: GatewayRates; revision: number; onSaved: (c: Costs & { gateways?: unknown }, revision: number) => void; breakdown: { product: number; gateway: number; tax: number; other: number; total: number } }) {
  const [draft, setDraft] = useState<Record<keyof Costs, string>>(() => Object.fromEntries(FIELDS.map((f) => [f.key, costs[f.key] ? String(costs[f.key]).replace(".", ",") : ""])) as Record<keyof Costs, string>);
  const [saving, setSaving] = useState(false), [msg, setMsg] = useState("");
  // Taxas próprias por gateway: campo vazio usa a taxa geral acima.
  const [gwDraft, setGwDraft] = useState<Record<string, { pct: string; fixed: string }>>(() => Object.fromEntries(Object.entries(rates).map(([k, v]) => [k, { pct: v.feePct ? String(v.feePct).replace(".", ",") : "", fixed: v.feeFixed ? String(v.feeFixed).replace(".", ",") : "" }])));
  const [gateways, setGateways] = useState<string[]>(() => Object.keys(rates));
  useEffect(() => {
    const c = new AbortController();
    fetch("/api/orders", { cache: "no-store", signal: c.signal }).then((r) => (r.ok ? r.json() : null)).then((b) => {
      const found = Array.isArray(b?.orders) ? b.orders.map((o: { provider?: string }) => String(o.provider || "").trim().toLowerCase()).filter(Boolean) : [];
      setGateways((cur) => [...new Set([...cur, ...found])].sort());
    }).catch(() => {});
    return () => c.abort();
  }, []);
  const parse = (v: string) => { const n = Number(v.replace(/\./g, "").replace(",", ".")); return Number.isFinite(n) && n > 0 ? n : 0; };
  const save = async () => {
    setSaving(true); setMsg("");
    const data = Object.fromEntries(FIELDS.map((f) => [f.key, parse(draft[f.key])])) as Costs;
    const gatewayData = Object.fromEntries(gateways.flatMap((g) => {
      const d = gwDraft[g];
      // Campo preenchido (mesmo com 0) vale; campo em branco usa a taxa geral.
      if (!d || (d.pct.trim() === "" && d.fixed.trim() === "")) return [];
      return [[g, { feePct: parse(d.pct), feeFixed: parse(d.fixed) }]];
    }));
    try {
      const r = await apiFetch("/api/tools/state?tool=custos", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ data: { ...data, gateways: gatewayData }, revision }) });
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
      <div className="space-y-2 border-t border-slate-200 pt-3">
        <p className="text-sm font-medium">Taxa por gateway <span className="font-normal text-slate-500">(opcional)</span></p>
        <p className="text-[11px] text-slate-500">Deixe em branco para usar a taxa geral acima. Cada gateway paga a própria taxa sobre as vendas dele.</p>
        {gateways.length === 0 && <p className="text-sm text-slate-500">Os gateways aparecem aqui depois da primeira venda recebida.</p>}
        {gateways.map((g) => (
          <div key={g} className="grid items-center gap-2 sm:grid-cols-[1fr_120px_120px]">
            <span className="text-sm capitalize">{g}</span>
            <input inputMode="decimal" aria-label={`Taxa % do ${g}`} placeholder="% (geral)" className="dashboard-input h-9" value={gwDraft[g]?.pct ?? ""} onChange={(e) => setGwDraft((d) => ({ ...d, [g]: { pct: e.target.value, fixed: d[g]?.fixed ?? "" } }))} />
            <input inputMode="decimal" aria-label={`Taxa fixa do ${g}`} placeholder="R$ fixo (geral)" className="dashboard-input h-9" value={gwDraft[g]?.fixed ?? ""} onChange={(e) => setGwDraft((d) => ({ ...d, [g]: { pct: d[g]?.pct ?? "", fixed: e.target.value } }))} />
          </div>
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
