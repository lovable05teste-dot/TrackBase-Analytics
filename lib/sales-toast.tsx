// Aviso visual de venda aprovada via Sonner. Independente do som: disparado
// pelo polling global quando `prefs.toast` está ligado.
"use client";
import { toast } from "sonner";

export type SaleToastData = {
  value: number | null;
  currency?: string | null;
  product?: string | null;   // utm_content (variante/oferta) quando disponível
  campaign?: string | null;  // utm_campaign
  project?: string | null;   // nome do projeto
};

const money = (v: number | null, c?: string | null) => {
  try { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: c || "BRL" }).format(v || 0); }
  catch { return `R$ ${(v || 0).toFixed(2)}`; }
};

function SaleCard({ id, d }: { id: string | number; d: SaleToastData }) {
  return (
    <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-card/95 px-4 py-3 shadow-2xl backdrop-blur">
      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-lg">💰</div>
      <div className="min-w-0 flex-1">
        <p className="text-base font-bold leading-tight text-emerald-600 dark:text-emerald-400">{money(d.value, d.currency)}</p>
        {d.product && <p className="truncate text-sm font-medium text-foreground">🛒 {d.product}</p>}
        {(d.campaign || d.project) && (
          <p className="truncate text-xs text-muted-foreground">{[d.project, d.campaign].filter(Boolean).join(" · ")}</p>
        )}
      </div>
      <button
        onClick={() => toast.dismiss(id)}
        className="shrink-0 rounded-md px-1.5 py-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Fechar notificação"
      >
        ✕
      </button>
    </div>
  );
}

/** Mostra o toast da venda. Cada chamada empilha (Sonner) com auto-close em 5s. */
export function showSaleToast(d: SaleToastData) {
  toast.custom(
    (id) => <SaleCard id={id} d={d} />,
    { duration: 5000, unstyled: true }
  );
}