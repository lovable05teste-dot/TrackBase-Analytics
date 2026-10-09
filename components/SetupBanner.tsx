import Link from "next/link";
import { ArrowRight, Rocket } from "lucide-react";

export type SetupProgress = { done: number; total: number; next: { id: string; title: string } | null };

// Aviso no topo do Dashboard enquanto a configuração de /integracoes não
// termina: mostra o próximo passo e leva direto para ele. Some quando tudo
// está concluído.
export function SetupBanner({ setup }: { setup: SetupProgress | null }) {
  if (!setup?.next) return null;
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-blue-300 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white"><Rocket className="size-5" /></span>
        <div className="min-w-0">
          <p className="font-semibold">Termine de configurar · {setup.done} de {setup.total} etapas</p>
          <p className="mt-0.5 text-sm text-slate-500">Próximo passo: <b className="text-slate-700">{setup.next.title}</b></p>
          <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-blue-600" style={{ width: `${(setup.done / setup.total) * 100}%` }} /></div>
        </div>
      </div>
      <Link href={`/integracoes#${setup.next.id}`} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700">Continuar<ArrowRight className="size-4" /></Link>
    </section>
  );
}
