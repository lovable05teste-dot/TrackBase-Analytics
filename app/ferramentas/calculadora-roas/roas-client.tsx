"use client";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RoasClient() {
  const [spend, setSpend] = useState("1000");
  const [revenue, setRevenue] = useState("3000");
  const [orders, setOrders] = useState("20");
  const r = useMemo(() => {
    const s = Number(spend) || 0, rev = Number(revenue) || 0, n = Number(orders) || 0;
    return { roas: s > 0 ? rev / s : 0, cpa: n > 0 ? s / n : 0, ticket: n > 0 ? rev / n : 0, lucro: rev - s };
  }, [spend, revenue, orders]);
  const input = "w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm";
  return (
    <Card className="metric-card">
      <CardHeader><CardTitle>Calculadora ROAS / CPA</CardTitle></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        <label className="text-sm">Gasto (R$)<input value={spend} onChange={(e) => setSpend(e.target.value)} inputMode="decimal" className={input} /></label>
        <label className="text-sm">Faturamento (R$)<input value={revenue} onChange={(e) => setRevenue(e.target.value)} inputMode="decimal" className={input} /></label>
        <label className="text-sm">Pedidos<input value={orders} onChange={(e) => setOrders(e.target.value)} inputMode="numeric" className={input} /></label>
        <div className="grid gap-3 md:col-span-3 sm:grid-cols-4">
          {[["ROAS", `${r.roas.toFixed(2)}x`], ["CPA", `R$ ${r.cpa.toFixed(2)}`], ["Ticket", `R$ ${r.ticket.toFixed(2)}`], ["Lucro bruto", `R$ ${r.lucro.toFixed(2)}`]].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-white/[.03] p-4"><p className="text-xs text-slate-500">{k}</p><p className="mt-1 text-xl font-semibold">{v}</p></div>
          ))}
        </div>
        <p className="text-xs text-slate-500 md:col-span-3">{r.roas >= 2 ? "✅ ROAS saudável para escala." : r.roas >= 1 ? "⚠️ Empate: otimize CPA ou ticket antes de escalar." : "🔴 Prejuízo: pause e revise oferta/criativo."}</p>
      </CardContent>
    </Card>
  );
}
