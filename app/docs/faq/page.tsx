import { HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Box } from "../components";

const faqs: { q: string; a: React.ReactNode }[] = [
  {
    q: "Meus números estão zerados. O que está acontecendo?",
    a: (
      <span>O painel só mostra números quando recebe eventos reais. Verifique: 1) o script está instalado antes de <code className="rounded bg-black/30 px-1 text-violet-300">&lt;/head&gt;</code>; 2) você acessou a página de vendas de verdade; 3) os UTMs estão ativos nos anúncios. Depois do primeiro clique com <code className="rounded bg-black/30 px-1 text-violet-300">fbclid</code> ou <code className="rounded bg-black/30 px-1 text-violet-300">utm_source</code>, os números começam a subir.</span>
    ),
  },
  {
    q: "Como conecto meu gateway de pagamento?",
    a: (
      <span>Entre em <b>Integrações → aba Gateways</b>, crie uma credencial (escolha o gateway — FortPay, FlevoPay, Hotmart, Kiwify, Utmify ou “Outro gateway”) e copie a <b>URL do webhook</b> e o <b>token</b>. Cole-os na configuração de webhooks da sua plataforma de pagamento. Veja o <a href="/docs/gateways" className="text-violet-300 underline underline-offset-2">guia completo de gateways</a>.</span>
    ),
  },
  {
    q: "Perdi o token da credencial, e agora?",
    a: (
      <span>O token é exibido uma única vez por segurança (ele é salvo apenas como hash no banco). Crie uma nova credencial no painel, obtenha um token novo e reative o webhook na sua plataforma. Recomendamos destruir o token antigo após a troca.</span>
    ),
  },
  {
    q: "Como a venda é atribuída à campanha certa?",
    a: (
      <span>Pelo <code className="rounded bg-black/30 px-1 text-violet-300">utm_campaign</code> (contém nome + ID da campanha) e pelo <code className="rounded bg-black/30 px-1 text-violet-300">fbclid</code>/<code className="rounded bg-black/30 px-1 text-violet-300">fbc</code>. O script da página captura isso automaticamente e o webhook do gateway repassa os campos de rastreamento (<code className="rounded bg-black/30 px-1 text-violet-300">tracking.*</code> / <code className="rounded bg-black/30 px-1 text-violet-300">metadata.*</code>). Sem UTMs ativos, as vendas aparecem mas não são ligadas a uma campanha.</span>
    ),
  },
  {
    q: "Como o ROAS é calculado?",
    a: (
      <span>ROAS = receita atribuída (soma dos <b>Purchase aprovados</b> com valor) ÷ gasto da campanha (Marketing API da Meta). Acompanhe em <b>Campanhas</b> com os períodos disponíveis. Você precisa ter contas Meta vinculadas e campanhas com UTMs ativos.</span>
    ),
  },
  {
    q: "Recebo erro 401 ao testar o webhook. O que faço?",
    a: (
      <span>O 401 significa token ausente, inválido ou desativado. Confira se o token está completo (começa com <code className="rounded bg-black/30 px-1 text-violet-300">tb_live_</code>), se chegou no header <code className="rounded bg-black/30 px-1 text-violet-300">Authorization: Bearer</code>, <code className="rounded bg-black/30 px-1 text-violet-300">X-TrackBase-Key</code> ou <code className="rounded bg-black/30 px-1 text-violet-300">?token=</code>, e se a credencial está ativa. Gere uma nova credencial se necessário.</span>
    ),
  },
  {
    q: "Por que os valores ficam errados (ex.: 4990 → 49,90)?",
    a: (
      <span>Isso é a <b>regra de centavos</b>: valores inteiros acima de 10000 são interpretados como centavos e divididos por 100. Se sua API trabalha com centavos, envie inteiros (ex.: <code className="rounded bg-black/30 px-1 text-violet-300">4990</code>). Se trabalha com decimais, envie decimais (ex.: <code className="rounded bg-black/30 px-1 text-violet-300">49.90</code>). A conversão é automática.</span>
    ),
  },
  {
    q: "Vou gerar vendas duplicadas?",
    a: (
      <span>Não. O webhook é idempotente: o pedido é identificado por <code className="rounded bg-black/30 px-1 text-violet-300">provider + external_id</code> e reenvios apenas atualizam o status. Eventos usam <code className="rounded bg-black/30 px-1 text-violet-300">event_id</code> único (project + event), então duplicados são ignorados — inclusive navegador × CAPI na Meta.</span>
    ),
  },
  {
    q: "O token de acesso da Meta expira?",
    a: (
      <span>O fluxo OAuth troca o token curto pelo <b>token de longa duração</b> ao vincular as contas. Se houver invalidação, basta reconectar a conta em <b>Contas Meta</b>. O token do CAPI (gerado no Gerenciador de Eventos) pode ser renovado e reconectado na aba Pixel &amp; CAPI.</span>
    ),
  },
  {
    q: "Posso usar um gateway que não está na lista?",
    a: (
      <span>Sim. Selecione <b>“Outro gateway”</b> na criação da credencial e envie o JSON no formato do seu sistema. Como os campos são detectados por heurística (<code className="rounded bg-black/30 px-1 text-violet-300">id</code>, <code className="rounded bg-black/30 px-1 text-violet-300">status</code>, <code className="rounded bg-black/30 px-1 text-violet-300">amount</code>, <code className="rounded bg-black/30 px-1 text-violet-300">tracking.*</code>), a maioria funciona sem adaptação.</span>
    ),
  },
  {
    q: "Preciso conectar contas Meta e Pixel?",
    a: (
      <span>Não é obrigatório para rastrear vendas: com o script + webhook do gateway você já vê vendas e funil. A conexão com as contas Meta adiciona <b>gasto, cliques, CPC/CPM e ROAS por campanha</b>, e o Pixel + CAPI melhora a otimização e atribuição dentro da Meta.</span>
    ),
  },
];

export default function FaqDoc() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-semibold"><HelpCircle className="size-6 text-violet-300" />Perguntas frequentes</h2>
        <p className="mt-1 text-sm text-slate-500">Dúvidas comuns de quem conecta a TrackBase com gateways e páginas de vendas.</p>
      </div>

      <Card className="metric-card"><CardContent className="p-4">
        <div className="divide-y divide-white/8">
          {faqs.map((f) => (
            <details key={f.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-2 py-4 text-sm font-medium text-slate-200 hover:text-white">
                {f.q}
                <span className="shrink-0 text-slate-500 transition-transform group-open:rotate-45">＋</span>
              </summary>
              <p className="px-2 pb-4 text-sm leading-6 text-slate-400">{f.a}</p>
            </details>
          ))}
        </div>
      </CardContent></Card>

      <Box tone="ok">Ainda com dúvidas? Abra o painel → <b>Integrações</b> para obter suas credenciais e URLs, e consulte o <a href="/docs/gateways" className="underline underline-offset-2">guia de gateways</a> para o passo a passo técnico.</Box>
    </section>
  );
}