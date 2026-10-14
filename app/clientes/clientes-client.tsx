"use client";
import { useEffect, useState } from "react";
import { Download, Search } from "lucide-react";
import { apiFetch } from "@/lib/plan-client";
import type { Customer } from "@/lib/customers";

type Totals = { customers: number; revenue: number; approvedOrders: number };
const PERIODS = [["all", "Todo o período"], ["30d", "Últimos 30 dias"], ["7d", "Últimos 7 dias"], ["this_month", "Este mês"]] as const;

function money(value: number, currency = "BRL") {
  try { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: /^[A-Z]{3}$/.test(currency) ? currency : "BRL" }).format(value || 0); }
  catch { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0); }
}
function when(ts: number) {
  if (!Number.isFinite(ts) || ts <= 0) return "—";
  return new Date(ts * 1000).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}
function csvEscape(v: string) { return /[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; }
function exportCsv(rows: Customer[]) {
  const header = ["Nome", "E-mail", "Telefone", "Compras aprovadas", "Pendentes", "Receita", "Ticket médio", "Primeira compra", "Última compra"];
  const lines = rows.map((c) => [c.name || "", c.email || "", c.phone || "", String(c.approvedCount), String(c.pendingCount), String(c.revenue).replace(".", ","), String(c.averageTicket.toFixed(2)).replace(".", ","), when(c.firstOrderAt), when(c.lastOrderAt)].map((v) => csvEscape(String(v))).join(";"));
  const blob = new Blob(["﻿" + [header.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export function ClientesClient() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totals, setTotals] = useState<Totals>({ customers: 0, revenue: 0, approvedOrders: 0 });
  const [period, setPeriod] = useState("all");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams({ period });
    if (q) params.set("q", q);
    apiFetch(`/api/customers?${params}`, { cache: "no-store" })
      .then(async (r) => { const b = await r.json(); if (!r.ok) throw new Error(b.error || "Falha ao carregar clientes."); return b; })
      .then((b) => { if (!alive) return; setCustomers(b.customers || []); setTotals(b.totals || { customers: 0, revenue: 0, approvedOrders: 0 }); setError(""); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "Falha ao carregar clientes."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [period, q]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#111113]"><p className="text-xs text-slate-500">Clientes</p><p className="mt-1 text-2xl font-semibold tabular-nums">{totals.customers}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#111113]"><p className="text-xs text-slate-500">Receita de clientes</p><p className="mt-1 text-2xl font-semibold tabular-nums">{money(totals.revenue)}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#111113]"><p className="text-xs text-slate-500">Compras aprovadas</p><p className="mt-1 text-2xl font-semibold tabular-nums">{totals.approvedOrders}</p></div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, e-mail ou telefone" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm dark:border-white/10 dark:bg-[#111113]" />
        </label>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#111113]">
          {PERIODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button type="button" onClick={() => exportCsv(customers)} disabled={!customers.length} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50 dark:border-white/10 dark:bg-[#111113]"><Download className="size-4" />Exportar CSV</button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#111113]">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-[#0e121d]">
            <tr>
              <th className="p-3">Cliente</th><th className="p-3">Telefone</th><th className="p-3 text-right">Compras</th><th className="p-3 text-right">Receita</th><th className="p-3 text-right">Ticket médio</th><th className="p-3">Primeira compra</th><th className="p-3">Última compra</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="p-6 text-center text-slate-500">Carregando…</td></tr>}
            {!loading && !customers.length && <tr><td colSpan={7} className="p-6 text-center text-slate-500">Nenhum cliente ainda. Eles aparecem aqui quando um webhook de venda chega com o e-mail do comprador.</td></tr>}
            {customers.map((c) => (
              <tr key={c.key} className="border-t border-slate-200 dark:border-white/10">
                <td className="p-3"><p className="font-medium">{c.name || "Sem nome"}</p><p className="text-xs text-slate-500">{c.email || "sem e-mail"}</p></td>
                <td className="p-3 tabular-nums text-slate-600 dark:text-slate-300">{c.phone || "—"}</td>
                <td className="p-3 text-right tabular-nums">{c.approvedCount}{c.pendingCount ? <span className="text-xs text-amber-600"> +{c.pendingCount} pend.</span> : null}</td>
                <td className="p-3 text-right font-medium tabular-nums">{money(c.revenue, c.currency)}</td>
                <td className="p-3 text-right tabular-nums">{money(c.averageTicket, c.currency)}</td>
                <td className="p-3 tabular-nums text-slate-500">{when(c.firstOrderAt)}</td>
                <td className="p-3 tabular-nums text-slate-500">{when(c.lastOrderAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
