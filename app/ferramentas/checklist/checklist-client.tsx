"use client";
import { useToolState, ToolSaveBar } from "@/components/use-tool-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ITEMS = [
  "Pixel + CAPI conectados e deduplicando por event_id",
  "UTMs padrão instaladas no anúncio (campaign/adset/ad)",
  "tracker.js instalado na página (publicKey correta)",
  "Evento InitiateCheckout dispara no botão de compra",
  "Webhook do gateway retornando 200 {received:true}",
  "CPA máximo calculado e anotado",
  "Criativos e hooks revisados para a oferta",
  "Orçamento e limite de gasto definidos para o teste",
  "Remarketing IC 7d + ViewContent 30d ativo",
  "Blacklist + Anti-Clone revisados",
];

export function ChecklistClient() {
  const store = useToolState<Record<string, boolean>>("checklist", {});
  const { data: done, setData: setDone } = store;
  const pct = Math.round((ITEMS.filter(item => done[item]).length / ITEMS.length) * 100);
  return (
    <><ToolSaveBar state={store} /><fieldset disabled={store.loading || store.saving || !store.canEdit} className="min-w-0">
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
    </fieldset></>
  );
}
