import { Crown } from "lucide-react";

// Faixa de modo visualização: aparece em TODAS as páginas privadas quando o
// usuário está logado mas sem plano ativo. Ver tudo pode; criar/editar não.
export function PlanBanner() {
  return (
    <div className="border-b border-[#FF0030]/25 bg-gradient-to-r from-[#FF0030]/[.08] via-[#FF0030]/[.04] to-transparent">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-5 py-2.5 lg:px-9">
        <p className="flex items-center gap-2 text-[13px] text-slate-600 dark:text-slate-300">
          <Crown className="size-4 shrink-0 text-[#FF4D67]" />
          <span>
            <b>Modo visualização</b> — você pode navegar em tudo, mas criar ou alterar exige um plano ativo.
          </span>
        </p>
        <a
          href="/planos"
          className="shrink-0 rounded-lg bg-[#ff0030] px-4 py-1.5 text-[13px] font-semibold text-white transition hover:bg-[#d60029]"
        >
          Ver planos
        </a>
      </div>
    </div>
  );
}
