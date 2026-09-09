import { PrivateSection } from "../../private-section";

export const dynamic = "force-dynamic";

const PLANS = [
  { name: "Start", price: "R$ 97/mês", feats: ["3 projetos", "Relatórios + UTMs", "Funil + Atribuição", "Suporte chat"], cta: "Assinar Start" },
  { name: "Scale", price: "R$ 197/mês", feats: ["15 projetos", "Tudo do Start", "Predict IA + Agent Hub", "Anti-Clone + Blacklist", "Comunidade + Rankings"], cta: "Assinar Scale", hot: true },
  { name: "Black Belt", price: "R$ 497/mês", feats: ["Projetos ilimitados", "Tudo do Scale", "Monitoramento + Offer Lab", "Onboarding 1:1"], cta: "Falar com time" },
];

export default function Page() {
  return (
    <PrivateSection title="Assinatura" description="Escolha o plano ideal para o seu volume.">
      <div className="grid gap-4 md:grid-cols-3">
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
    </PrivateSection>
  );
}
