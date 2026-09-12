import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso — GhostScale",
  description: "Termos de Uso da plataforma GhostScale.",
};

const updated = "10 de setembro de 2026";

export default function Termos() {
  return (
    <main className="min-h-screen bg-[#080b12] text-slate-100">
      <div className="mx-auto max-w-3xl px-5 py-12">
        <a href="/login" className="inline-flex items-center gap-2.5">
          <img src="/ghostscale-logo.png" alt="Logo GhostScale" className="h-9 w-auto object-contain" />
          <b className="text-[15px]">GhostScale</b>
        </a>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-[#ff3b5c]">Termos de Uso</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Termos de Uso da GhostScale</h1>
        <p className="mt-2 text-sm text-slate-500">Última atualização: {updated}.</p>

        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-slate-300">
          <section>
            <h2 className="text-lg font-semibold text-white">1. O que é a GhostScale</h2>
            <p className="mt-2">A GhostScale é uma plataforma de rastreamento e inteligência para tráfego pago: script de tracking, Conversions API (CAPI) da Meta, webhook universal de vendas e painéis de atribuição, funil e ROAS por campanha.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">2. Conta e acesso</h2>
            <p className="mt-2">2.1. Para usar a plataforma você cria uma conta com e-mail, CPF e senha. 2.2. Você é responsável por manter sua senha em sigilo e por toda atividade feita na sua conta. 2.3. Contas com dados falsos ou uso fraudulento podem ser suspensas.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">3. Preço e cobrança</h2>
            <p className="mt-2">3.1. A GhostScale cobra uma <b className="text-white">base mensal conforme o plano</b> (Start R$ 39,90 · Pro R$ 69,90 · Scale R$ 89,90 · Black R$ 119,90), cada um com franquia de vendas aprovadas inclusa, mais <b className="text-white">R$ 0,10 (dez centavos) por venda aprovada excedente</b> — exceto o plano Black, ilimitado e sem excedente. 3.2. Vendas pendentes, reembolsadas, canceladas e chargebacks <b className="text-white">não geram cobrança</b>. 3.3. Não há taxa de setup. A base mensal varia conforme o plano contratado e pode ser alterada mediante aviso prévio. 3.4. O não pagamento de valores devidos pode suspender o acesso até a regularização.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">4. Uso aceitável</h2>
            <p className="mt-2">4.1. É proibido usar a plataforma para atividades ilegais, fraude, spam, violação de direitos de terceiros ou tentativa de burlar o rastreamento. 4.2. É proibido tentar acessar áreas restritas, extrair dados de outros usuários ou prejudicar a operação do serviço.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">5. Dados e privacidade</h2>
            <p className="mt-2">O tratamento de dados pessoais segue a nossa <a href="/privacidade" className="text-red-400 underline underline-offset-2 hover:text-red-300">Política de Privacidade</a> e a LGPD (Lei nº 13.709/2018).</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">6. Disponibilidade e suporte</h2>
            <p className="mt-2">Buscamos alta disponibilidade, mas o serviço pode passar por manutenções e instabilidades. O suporte atende dúvidas de operação e integração pelos canais oficiais.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">7. Cancelamento</h2>
            <p className="mt-2">Você pode parar de usar a plataforma quando quiser. Valores referentes a vendas aprovadas já rastreadas permanecem devidos.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">8. Alterações</h2>
            <p className="mt-2">Estes termos podem ser atualizados. Mudanças relevantes serão comunicadas no painel ou por e-mail, e o uso contínuo após a atualização indica concordância.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">9. Contato e foro</h2>
            <p className="mt-2">Dúvidas sobre estes termos: fale com o suporte pelos canais oficiais. Fica eleito o foro do domicílio do usuário, salvo regra legal em contrário.</p>
          </section>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <a href="/login?modo=register" className="rounded-2xl bg-[#ff0030] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#d60029]">Criar conta grátis</a>
          <a href="/privacidade" className="rounded-2xl border border-white/15 px-6 py-3.5 text-sm text-slate-300 hover:bg-white/5">Política de Privacidade</a>
        </div>
        <p className="mt-8 text-xs text-slate-600">© 2026 GhostScale. Todos os direitos reservados.</p>
      </div>
    </main>
  );
}
