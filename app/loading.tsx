// Tela de carregamento entre páginas: marca com anel em gradiente, brilho
// pulsando e barra de progresso (respeita "reduzir movimento").
export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-6" role="status" aria-live="polite">
        <div className="gs-loader" aria-hidden="true">
          <span className="gs-loader-glow" />
          <span className="gs-loader-ring" />
          <span className="gs-loader-ring is-slow" />
          <img src="/ghostscale-ghost.png" alt="" className="gs-loader-logo" />
        </div>
        <div className="flex flex-col items-center gap-3">
          <span className="gs-progress" />
          <p className="text-xs font-medium uppercase tracking-[.2em] text-muted-foreground">Carregando</p>
        </div>
      </div>
    </main>
  );
}
