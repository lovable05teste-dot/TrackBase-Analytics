"use client";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CpaMaxClient() {
  const [price, setPrice] = useState("197");
  const [margin, setMargin] = useState("70");
  const [conv, setConv] = useState("3");
  const r = useMemo(() => {
    const p = Number(price) || 0, m = (Number(margin) || 0) / 100, c = (Number(conv) || 0) / 100;
    const lucroPedido = p * m;
    const cpaMax = lucroPedido; // break-even por venda
    const cpcMax = cpaMax * c;
    return { lucroPedido, cpaMax, cpcMax };
  }, [price, margin, conv]);
  const input = "w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm";
  return (
    <Card className="metric-card">
      <CardHeader><CardTitle>CPA Máximo</CardTitle></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        <label className="text-sm">Preço (R$)<input value={price} onChange={(e) => setPrice(e.target.value)} className={input} /></label>
        <label className="text-sm">Margem %<input value={margin} onChange={(e) => setMargin(e.target.value)} className={input} /></label>
        <label className="text-sm">Conversão checkout→compra %<input value={conv} onChange={(e) => setConv(e.target.value)} className={input} /></label>
        <div className="grid gap-3 md:col-span-3 sm:grid-cols-3">
          {[["Lucro por pedido", `R$ ${r.lucroPedido.toFixed(2)}`], ["CPA máximo (break-even)", `R$ ${r.cpaMax.toFixed(2)}`], ["CPC máximo", `R$ ${r.cpcMax.toFixed(2)}`]].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-white/[.03] p-4"><p className="text-xs text-slate-500">{k}</p><p className="mt-1 text-xl font-semibold">{v}</p></div>
          ))}
        </div>
        <p className="text-xs text-slate-500 md:col-span-3">Regra: pause conjuntos com CPA 30% acima do máximo por 3 dias seguidos. Escale os 30% abaixo.</p>
      </CardContent>
    </Card>
  );
}
