import { AppShell } from "@/components/AppShell";

export const dynamic = "force-dynamic";

const PLANS = [
  { name: "Start", price: "R$ 39,90/mês", feats: ["3 projetos", "Até 500 vendas/mês inclusas", "Excedente R$ 0,10/venda aprovada", "Relatórios + UTMs + Funil", "Suporte chat"], cta: "Assinar Start" },
  { name: "Pro", price: "R$ 69,90/mês", feats: ["10 projetos", "Até 1.000 vendas/mês inclusas", "Excedente R$ 0,10/venda aprovada", "Tudo do Start + Predict IA", "Comunidade + Rankings"], cta: "Assinar Pro", hot: true },
  { name: "Scale", price: "R$ 89,90/mês", feats: ["20 projetos", "Até 2.000 vendas/mês inclusas", "Excedente R$ 0,10/venda aprovada", "Tudo do Pro + Anti-Clone + Blacklist", "Monitoramento + Offer Lab"], cta: "Assinar Scale" },
  { name: "Black", price: "R$ 119,90/mês", feats: ["Projetos ilimitados", "Vendas ilimitadas sem excedente", "Tudo do Scale + Agent Hub", "Onboarding 1:1"], cta: "Assinar Black" },
];

export default function Page() {
  return (
    <AppShell title="Assinatura" subtitle="Base mensal + R$ 0,10 por venda aprovada excedente. Black é ilimitado.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((p) => (
          <div key={p.name} className={`metric-card rounded-xl p-6 ${p.hot ? "border-violet-400/40" : ""}`}>
            {p.hot ? <span className="mb-3 inline-block rounded-full bg-violet-500/20 px-3 py-1 text-xs text-violet-200">Mais popular</span> : null}
            <h3 className="text-lg font-semibold">{p.name}</h3>
            <p className="mt-1 text-2xl font-bold text-violet-200">{p.price}</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">{p.feats.map((f) => <li key={f}>✓ {f}</li>)}</ul>
            <a href="/conta/assinatura-avancada" className="mt-5 block rounded-lg bg-violet-600 px-4 py-2.5 text-center text-sm font-medium hover:bg-violet-500">{p.cta}</a>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-500">Precisa de TikTok + Meta juntos? Veja a <a href="/conta/assinatura-avancada" className="underline text-violet-300">Assinatura Avançado</a>.</p>
    </AppShell>
  );
}
