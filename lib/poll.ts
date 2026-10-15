// Polling com cuidado: não consulta com a aba oculta, recua de forma
// exponencial quando a consulta falha e não empilha duas consultas em paralelo.
// Devolve a função de parada, para usar como cleanup de useEffect.
export type PollOutcome = "ok" | "error" | "stop";

export function startPolling(
  task: () => Promise<PollOutcome>,
  opts: { intervalMs: number; maxBackoffMs?: number; immediate?: boolean },
): () => void {
  const maxBackoff = opts.maxBackoffMs ?? 5 * 60_000;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let failures = 0;
  let stopped = false;
  let inFlight = false;

  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  const schedule = (delay: number) => {
    clear();
    if (stopped || document.hidden) return;
    timer = setTimeout(run, delay);
  };
  async function run() {
    timer = null;
    if (stopped || document.hidden || inFlight) return;
    inFlight = true;
    let outcome: PollOutcome;
    try {
      outcome = await task();
    } catch {
      outcome = "error";
    } finally {
      inFlight = false;
    }
    if (stopped) return;
    if (outcome === "stop") {
      stopped = true;
      return;
    }
    failures = outcome === "error" ? failures + 1 : 0;
    schedule(failures ? Math.min(maxBackoff, opts.intervalMs * 2 ** failures) : opts.intervalMs);
  }
  const onVisibility = () => {
    if (!document.hidden) {
      clear();
      void run();
    }
  };

  document.addEventListener("visibilitychange", onVisibility);
  if (opts.immediate) void run();
  else schedule(opts.intervalMs);

  return () => {
    stopped = true;
    clear();
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
