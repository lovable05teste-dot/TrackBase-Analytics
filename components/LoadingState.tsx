// Carregamento dentro das páginas: linhas-esqueleto com brilho passando,
// no formato do conteúdo que vai chegar (lista, cartões ou bloco simples).
export function LoadingState({ label = "Carregando", rows = 3, variant = "list", className = "" }: { label?: string; rows?: number; variant?: "list" | "cards" | "inline"; className?: string }) {
  if (variant === "inline") {
    return (
      <div role="status" aria-label={label} className={`flex items-center gap-3 text-sm text-muted-foreground ${className}`}>
        <span className="gs-progress !w-16" aria-hidden="true" />
        <span>{label}…</span>
      </div>
    );
  }
  if (variant === "cards") {
    return (
      <div role="status" aria-label={label} className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="rounded-xl border border-border p-4">
            <div className="gs-shimmer h-3 w-1/3 rounded" />
            <div className="gs-shimmer mt-4 h-6 w-2/3 rounded" />
            <div className="gs-shimmer mt-3 h-3 w-1/2 rounded" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div role="status" aria-label={label} className={`space-y-3 rounded-xl border border-border p-4 ${className}`}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="gs-shimmer size-9 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="gs-shimmer h-3 rounded" style={{ width: `${70 - i * 12}%` }} />
            <div className="gs-shimmer h-2.5 w-1/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
