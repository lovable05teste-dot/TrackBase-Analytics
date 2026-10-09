export type FunnelStage = { name: string; hint?: string; value: number };

const number = (v: number) => new Intl.NumberFormat("pt-BR").format(Math.round(v || 0));
const pct = (v: number) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

// Funil em faixa contínua (estilo Utmify): a largura de cada etapa é
// proporcional ao volume, com curvas suaves entre as etapas. O % do meio é
// em relação à primeira etapa; o número absoluto fica embaixo.
const W = 1000;
const H = 220;
const MID = H / 2;
const MAX_HALF = H / 2 - 4;
const MIN_HALF = 10;

export function ConversionFunnel({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(1, ...stages.map((s) => s.value));
  const base = stages[0]?.value || max;
  const col = W / stages.length;
  const half = stages.map((s) => (s.value > 0 ? MIN_HALF + (s.value / max) * (MAX_HALF - MIN_HALF) : MIN_HALF / 2));
  const centers = stages.map((_, i) => col * i + col / 2);

  // Contorno de cima (esquerda → direita) e de baixo (direita → esquerda).
  let top = `M0 ${MID - half[0]} L${centers[0]} ${MID - half[0]}`;
  for (let i = 0; i < stages.length - 1; i++) {
    const d = centers[i + 1] - centers[i];
    top += ` C${centers[i] + d * 0.55} ${MID - half[i]} ${centers[i + 1] - d * 0.55} ${MID - half[i + 1]} ${centers[i + 1]} ${MID - half[i + 1]}`;
  }
  const last = stages.length - 1;
  top += ` L${W} ${MID - half[last]} L${W} ${MID + half[last]} L${centers[last]} ${MID + half[last]}`;
  for (let i = last; i > 0; i--) {
    const d = centers[i] - centers[i - 1];
    top += ` C${centers[i] - d * 0.55} ${MID + half[i]} ${centers[i - 1] + d * 0.55} ${MID + half[i - 1]} ${centers[i - 1]} ${MID + half[i - 1]}`;
  }
  top += ` L0 ${MID + half[0]} Z`;

  if (stages.every((s) => !s.value)) {
    return <p className="mt-6 rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">Ainda sem dados no período. O funil aparece quando chegarem cliques, visitas e vendas.</p>;
  }

  return (
    <div className="mt-5 overflow-hidden rounded-xl bg-[#1f2738] text-white">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
        {stages.map((s, i) => (
          <div key={s.name} className={`px-1 pb-2 pt-4 text-center ${i ? "border-l border-indigo-300/30" : ""}`}>
            <p className="truncate text-[11px] font-semibold text-slate-200 sm:text-sm" title={s.hint}>{s.name}</p>
          </div>
        ))}
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-40 w-full sm:h-56" role="img" aria-label={stages.map((s) => `${s.name}: ${number(s.value)}`).join(", ")}>
          <defs>
            <linearGradient id="gs-funnel-gradient" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#0b5cf0" />
              <stop offset="55%" stopColor="#6d42c7" />
              <stop offset="100%" stopColor="#d22d74" />
            </linearGradient>
          </defs>
          <path d={top} fill="url(#gs-funnel-gradient)" />
          {stages.slice(1).map((s, i) => <line key={s.name} x1={col * (i + 1)} x2={col * (i + 1)} y1={0} y2={H} stroke="#a5b4fc" strokeOpacity="0.35" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />)}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid items-center" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
          {stages.map((s, i) => (
            <p key={s.name} className="text-center text-sm font-bold drop-shadow sm:text-xl">{i === 0 ? (s.value ? "100%" : "—") : base ? pct((s.value / base) * 100) : "—"}</p>
          ))}
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
        {stages.map((s, i) => (
          <div key={s.name} className={`px-1 pb-4 pt-2 text-center ${i ? "border-l border-indigo-300/30" : ""}`}>
            <p className="text-sm font-semibold tabular-nums text-slate-200 sm:text-base">{number(s.value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
