export type FunnelStage = { name: string; hint?: string; value: number };

const number = (v: number) => new Intl.NumberFormat("pt-BR").format(Math.round(v || 0));
const pct = (v: number) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

// Funil em faixa contínua: a largura de cada etapa é proporcional ao volume,
// com curvas suaves entre as etapas, nas cores da marca (roxo → azul → ciano).
// No meio: % em relação à primeira etapa. Embaixo: o número e a passagem da
// etapa anterior para esta.
const W = 1000;
const H = 220;
const MID = H / 2;
const MAX_HALF = H / 2 - 6;
const MIN_HALF = 10;

export function ConversionFunnel({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(1, ...stages.map((s) => s.value));
  const base = stages[0]?.value || max;
  const col = W / stages.length;
  const half = stages.map((s) => (s.value > 0 ? MIN_HALF + (s.value / max) * (MAX_HALF - MIN_HALF) : MIN_HALF / 2));
  const centers = stages.map((_, i) => col * i + col / 2);

  // Contorno de cima (esquerda → direita) e de baixo (direita → esquerda).
  let path = `M0 ${MID - half[0]} L${centers[0]} ${MID - half[0]}`;
  for (let i = 0; i < stages.length - 1; i++) {
    const d = centers[i + 1] - centers[i];
    path += ` C${centers[i] + d * 0.55} ${MID - half[i]} ${centers[i + 1] - d * 0.55} ${MID - half[i + 1]} ${centers[i + 1]} ${MID - half[i + 1]}`;
  }
  const last = stages.length - 1;
  path += ` L${W} ${MID - half[last]} L${W} ${MID + half[last]} L${centers[last]} ${MID + half[last]}`;
  for (let i = last; i > 0; i--) {
    const d = centers[i] - centers[i - 1];
    path += ` C${centers[i] - d * 0.55} ${MID + half[i]} ${centers[i - 1] + d * 0.55} ${MID + half[i - 1]} ${centers[i - 1]} ${MID + half[i - 1]}`;
  }
  path += ` L0 ${MID + half[0]} Z`;

  if (stages.every((s) => !s.value)) {
    return <p className="mt-6 rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">Ainda sem dados no período. O funil aparece quando chegarem cliques, checkouts e vendas.</p>;
  }

  const grid = { gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` };

  return (
    <div className="gs-funnel mt-5 overflow-hidden rounded-2xl">
      <div className="grid" style={grid}>
        {stages.map((s, i) => (
          <div key={s.name} className={`px-1 pb-2 pt-4 text-center ${i ? "gs-funnel-divider" : ""}`}>
            <p className="text-[10px] font-semibold uppercase leading-tight tracking-[.04em] text-slate-400 sm:truncate sm:text-xs sm:tracking-[.12em]" title={s.hint}>{s.name}</p>
          </div>
        ))}
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-36 w-full sm:h-52" role="img" aria-label={stages.map((s) => `${s.name}: ${number(s.value)}`).join(", ")}>
          <defs>
            <linearGradient id="gs-funnel-gradient" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
            <linearGradient id="gs-funnel-shine" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
              <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.18" />
            </linearGradient>
            <filter id="gs-funnel-glow" x="-10%" y="-30%" width="120%" height="160%">
              <feGaussianBlur stdDeviation="14" />
            </filter>
          </defs>
          <path d={path} fill="url(#gs-funnel-gradient)" opacity="0.45" filter="url(#gs-funnel-glow)" />
          <path d={path} fill="url(#gs-funnel-gradient)" />
          <path d={path} fill="url(#gs-funnel-shine)" />
          {stages.slice(1).map((s, i) => <line key={s.name} x1={col * (i + 1)} x2={col * (i + 1)} y1={0} y2={H} stroke="#ffffff" strokeOpacity="0.12" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid items-center" style={grid}>
          {stages.map((s, i) => (
            <p key={s.name} className="text-center text-sm font-bold text-white [text-shadow:0_1px_8px_rgba(0,0,0,.45)] sm:text-2xl">{i === 0 ? (s.value ? "100%" : "—") : base ? pct((s.value / base) * 100) : "—"}</p>
          ))}
        </div>
      </div>
      <div className="grid" style={grid}>
        {stages.map((s, i) => {
          const prev = i ? stages[i - 1].value : 0;
          return (
            <div key={s.name} className={`px-1 pb-4 pt-2 text-center ${i ? "gs-funnel-divider" : ""}`}>
              <p className="text-base font-semibold tabular-nums text-white sm:text-xl">{number(s.value)}</p>
              {i > 0 && <p className="mt-1 min-h-4 text-[10px] text-slate-400 sm:text-xs">{prev && s.value <= prev ? `${pct((s.value / prev) * 100)} da etapa anterior` : ""}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
