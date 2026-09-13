import { Crown, Lock } from "lucide-react";

// Tela padrão de páginas de CRIAÇÃO quando o usuário está logado mas sem
// plano ativo: não redireciona — mostra o cadeado e o caminho (Ver planos).
export function UpgradeCta({ what, minPlan }: { what: string; minPlan?: string }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-[#FF0030]/25 bg-card p-8 text-center sm:p-10">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#FF0030]/10 text-[#FF4D67]">
        <Lock className="size-6" />
      </span>
      <h2 className="mt-4 text-xl font-bold">{what} é um recurso de assinante</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Você pode navegar por todo o painel no modo visualização, mas para criar ou alterar é preciso um plano ativo
        {minPlan ? (
          <>
            {" "}(a partir do <b>{minPlan}</b>)
          </>
        ) : null}
        .
      </p>
      <a
        href="/planos"
        className="mt-6 inline-flex h-12 items-center gap-2.5 rounded-xl bg-[#ff0030] px-8 text-[15px] font-semibold text-white transition hover:bg-[#d60029]"
      >
        <Crown className="size-4" />
        Ver planos
      </a>
    </div>
  );
}
