"use client";
import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NamesClient() {
  const [oferta, setOferta] = useState("KIT-BIBLICO");
  const [angulo, setAngulo] = useState("DOR");
  const [formato, setFormato] = useState("VSL");
  const [data, setData] = useState("2026-09");
  const [copied, setCopied] = useState("");
  const names = useMemo(() => {
    const base = `${oferta.toUpperCase().replace(/\s+/g, "-")}_${angulo.toUpperCase()}_${formato.toUpperCase()}_${data}`;
    return [`CBO_${base}_01`, `ABO_${base}_TESTE-CRIATIVO`, `${base}_RMKT-IC90D`];
  }, [oferta, angulo, formato, data]);
  async function copy(n: string) { await navigator.clipboard.writeText(n); setCopied(n); setTimeout(() => setCopied(""), 1200); }
  const input = "w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm";
  return (
    <Card className="metric-card">
      <CardHeader><CardTitle>Nomes de Campanha</CardTitle></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-4">
        <label className="text-sm">Oferta<input value={oferta} onChange={(e) => setOferta(e.target.value)} className={input} /></label>
        <label className="text-sm">Ângulo<input value={angulo} onChange={(e) => setAngulo(e.target.value)} className={input} /></label>
        <label className="text-sm">Formato<input value={formato} onChange={(e) => setFormato(e.target.value)} className={input} /></label>
        <label className="text-sm">Data<input value={data} onChange={(e) => setData(e.target.value)} className={input} /></label>
        <div className="space-y-2 md:col-span-4">
          {names.map((n) => (
            <div key={n} className="flex items-center justify-between gap-3 rounded-lg bg-black/30 p-3"><code className="truncate text-sm text-sky-300">{n}</code><Button size="sm" variant="outline" onClick={() => copy(n)}>{copied === n ? <Check /> : <Copy />}</Button></div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
