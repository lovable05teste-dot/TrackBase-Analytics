"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Delivery = { id: string; eventId: string; pixelId:string; project: string; status: string; attempts: number; error: string | null };
const labels: Record<string, string> = { sent: "Recebida pela Meta", pending: "Aguardando reenvio", processing: "Enviando", dead: "Precisa de atenção" };
async function readDeliveries(projectId?:string,signal?: AbortSignal): Promise<Delivery[]> {
  const response = await fetch(`/api/meta/capi-deliveries${projectId?`?projectId=${encodeURIComponent(projectId)}`:""}`, { cache: "no-store", signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Não foi possível consultar os envios.");
  return data.deliveries;
}

export function CapiDeliveryStatus({projectId}:{projectId?:string}={}) {
  const [rows, setRows] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setRows(await readDeliveries(projectId)); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao consultar os envios."); }
    finally { setLoading(false); }
  }, [projectId]);
  useEffect(() => {
    const controller = new AbortController();
    void readDeliveries(projectId,controller.signal).then(data => {
      if (!controller.signal.aborted) { setRows(data); setError(""); }
    }).catch(e => {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Falha ao consultar os envios.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [projectId]);
  async function retry(id: string) {
    setBusy(id);
    try {
      const response = await fetch("/api/meta/capi-deliveries", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha no reenvio.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Falha no reenvio."); }
    finally { setBusy(null); }
  }
  return <section className="mt-6 space-y-3 rounded-xl border p-4" aria-label="Entrega das compras à Meta">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Compras enviadas à Meta</h2><Button variant="outline" disabled={loading || !!busy} onClick={() => { setLoading(true); void load(); }}>Atualizar</Button></div>
    <p className="text-sm text-muted-foreground">Confirmação de recebimento pela API de Conversões. A atribuição aos anúncios é calculada pela Meta e pode levar mais tempo.</p>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {loading && !rows.length ? <p role="status">Consultando envios…</p> : !rows.length && !error ? <p className="text-sm">Nenhum registro de entrega disponível. Vendas anteriores a esta atualização podem não ter confirmação armazenada.</p> : null}
    {rows.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
      <div className="min-w-0 flex-1"><p className="font-medium">{row.project}</p><p className="break-all text-sm">Pixel Meta: {row.pixelId||"Destino legado"}</p><p className="break-all text-xs text-muted-foreground">Evento: {row.eventId}</p><p className={row.status === "sent" ? "text-sm text-emerald-600" : "text-sm text-amber-600"}>{labels[row.status] || row.status}</p>{row.error && <p className="break-words text-xs text-red-600">{row.error}</p>}</div>
      {["pending", "dead"].includes(row.status) && <Button variant="outline" disabled={!!busy} onClick={() => void retry(row.id)}>{busy === row.id ? "Reenviando…" : "Tentar novamente"}</Button>}
    </div>)}
  </section>;
}
