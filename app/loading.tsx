export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#080b12] text-slate-100">
      <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
        <div className="size-9 animate-spin rounded-full border-2 border-white/15 border-t-red-500" />
        <p className="text-sm text-slate-400">Carregando GhostScale…</p>
      </div>
    </main>
  );
}
