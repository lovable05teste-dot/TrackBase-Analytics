import { ArrowDown } from "lucide-react";

export type FunnelStage = { name: string; hint: string; value: number };

const number = (v: number) => new Intl.NumberFormat("pt-BR").format(Math.round(v || 0));
const pct = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

// Funil em linhas: cada etapa com nome por extenso, número, barra
// proporcional à maior etapa e, entre as etapas, quanto passou adiante.
export function ConversionFunnel({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(1, ...stages.map((s) => s.value));
  const first = stages[0]?.value || 0;
  const last = stages.at(-1)?.value || 0;
  const empty = stages.every((s) => !s.value);

  if (empty) {
    return <p className="mt-6 rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">Ainda sem dados no período. Os números aparecem quando chegarem cliques, visitas e vendas.</p>;
  }

  return (
    <div className="mt-5">
      <ol>
        {stages.map((stage, i) => {
          const prev = i ? stages[i - 1].value : 0;
          const rate = prev ? (stage.value / prev) * 100 : null;
          const width = stage.value ? Math.max(2, (stage.value / max) * 100) : 0;
          return (
            <li key={stage.name}>
              {i > 0 && (
                <div className="flex items-center gap-2 py-1.5 pl-1 text-xs text-slate-500">
                  <ArrowDown className="size-3.5 shrink-0" />
                  {rate === null ? <span>sem dados na etapa anterior</span> : <span><b className="text-slate-700">{pct(rate)}</b> seguiram para esta etapa</span>}
                </div>
              )}
              <div className="rounded-xl border border-slate-200 bg-muted/40 p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{stage.name}</p>
                    <p className="truncate text-[11px] text-slate-500">{stage.hint}</p>
                  </div>
                  <b className="shrink-0 text-xl tabular-nums">{number(stage.value)}</b>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-foreground/10" aria-hidden>
                  <div className="h-full rounded-full bg-gradient-to-r from-rose-700 to-rose-400 transition-[width] duration-700" style={{ width: `${width}%` }} />
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 rounded-lg bg-muted/50 px-3 py-2 text-sm text-slate-500">
        {first ? <>De cada 100 cliques, <b className="text-slate-700">{(last / first * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</b> viraram venda.</> : "Conecte a conta Meta para ver os cliques e a conversão total."}
      </p>
    </div>
  );
}
