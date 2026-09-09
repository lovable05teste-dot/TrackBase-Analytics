"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const KEY = "tb_checklist_campanha";
const ITEMS = [
  "Pixel + CAPI conectados e deduplicando por event_id",
  "UTMs padrão instaladas no anúncio (campaign/adset/ad)",
  "tracker.js instalado na página (publicKey correta)",
  "Evento InitiateCheckout dispara no botão de compra",
  "Webhook do gateway retornando 200 {received:true}",
  "CPA máximo calculado e anotado",
  "3 criativos + 2 hooks por conjunto",
  "Orçamento inicial = 1x CPA/dia por conjunto",
  "Remarketing IC 7d + ViewContent 30d ativo",
  "Blacklist + Anti-Clone revisados",
];

export function ChecklistClient() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  useEffect(() => { try { setDone(JSON.parse(localStorage.getItem(KEY) || "{}")); } catch { setDone({}); } }, []);
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(done)); }, [done]);
  const pct = Math.round((Object.values(done).filter(Boolean).length / ITEMS.length) * 100);
  return (
    <Card className="metric-card">
      <CardHeader><CardTitle>Checklist Campanha — {pct}%</CardTitle></CardHeader>
      <CardContent>
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-violet-500 transition-all" style={{ width: `${pct}%` }} /></div>
        <div className="space-y-2">
          {ITEMS.map((item) => (
            <label key={item} className="flex cursor-pointer items-center gap-3 rounded-lg bg-white/[.03] p-3 text-sm hover:bg-white/[.05]">
              <input type="checkbox" checked={!!done[item]} onChange={() => setDone((d) => ({ ...d, [item]: !d[item] }))} className="size-4 accent-violet-500" />
              <span className={done[item] ? "text-slate-500 line-through" : ""}>{item}</span>
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
