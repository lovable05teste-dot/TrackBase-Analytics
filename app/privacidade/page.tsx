import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade — GhostScale",
  description: "Como a GhostScale trata dados pessoais (LGPD).",
};

const updated = "10 de setembro de 2026";

export default function Privacidade() {
  return (
    <main className="min-h-screen bg-[#080b12] text-slate-100">
      <div className="mx-auto max-w-3xl px-5 py-12">
        <a href="/login" className="inline-flex items-center gap-2.5">
          <img src="/ghostscale-logo.png" alt="Logo GhostScale" className="h-9 w-auto object-contain" />
          <b className="text-[15px]">GhostScale</b>
        </a>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-[#ff3b5c]">Privacidade · LGPD</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Política de Privacidade</h1>
        <p className="mt-2 text-sm text-slate-500">Última atualização: {updated}. Lei aplicável: LGPD (Lei nº 13.709/2018).</p>

        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-slate-300">
          <section>
            <h2 className="text-lg font-semibold text-white">1. Quais dados coletamos</h2>
            <p className="mt-2">1.1. <b className="text-white">Conta:</b> nome, e-mail, CPF e senha (armazenada com hash). 1.2. <b className="text-white">Tracking:</b> UTMs, fbclid, fbp/fbc, identificador de visitante, páginas vistas e eventos de checkout/compra nas páginas onde o script está instalado. 1.3. <b className="text-white">Vendas:</b> dados enviados pelos gateways via webhook (ID do pedido, status, valor, moeda e dados de atribuição). 1.4. <b className="text-white">Integrações Meta:</b> tokens de acesso (cifrados com AES-GCM) e métricas de campanhas.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">2. Para que usamos</h2>
            <p className="mt-2">Atribuição de vendas a campanhas, cálculo de ROAS, funil, relatórios, detecção antifraude e anticlone, monitoramento, cobrança por venda aprovada e melhoria do serviço. Não vendemos seus dados.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">3. Compartilhamento</h2>
            <p className="mt-2">Compartilhamos dados apenas quando necessário para operar: (a) Meta (eventos CAPI do seu Pixel); (b) provedores de infraestrutura (hospedagem e banco de dados); (c) autoridades, quando exigido por lei.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">4. Segurança</h2>
            <p className="mt-2">Senhas com hash, tokens da Meta cifrados (AES-GCM), webhooks autenticados por Bearer e acessos isolados por workspace/projeto.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">5. Seus direitos (LGPD)</h2>
            <p className="mt-2">Você pode pedir confirmação, acesso, correção, anonimização, portabilidade e eliminação dos seus dados pessoais, além de revogar consentimentos. Fale com o suporte pelos canais oficiais para exercer qualquer direito.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">6. Cookies e identificadores</h2>
            <p className="mt-2">Usamos cookie de sessão para manter você logado e identificadores de visitante para unir clique e compra na atribuição.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">7. Retenção e eliminação</h2>
            <p className="mt-2">Mantemos os dados pelo tempo necessário à operação e às obrigações legais. Você pode solicitar a eliminação da conta e dos dados pessoais associados, observados os prazos legais de guarda.</p>
          </section>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <a href="/login?modo=register" className="rounded-2xl bg-[#ff0030] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#d60029]">Criar conta grátis</a>
          <a href="/termos" className="rounded-2xl border border-white/15 px-6 py-3.5 text-sm text-slate-300 hover:bg-white/5">Termos de Uso</a>
        </div>
        <p className="mt-8 text-xs text-slate-600">© 2026 GhostScale. Todos os direitos reservados.</p>
      </div>
    </main>
  );
}
