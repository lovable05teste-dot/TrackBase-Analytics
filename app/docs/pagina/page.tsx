import { Code, Box, H3, Step, Table } from "../components";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonitorSmartphone, Radio, Rocket } from "lucide-react";

const metaUtm = "utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}|{{campaign.id}}&utm_content={{ad.name}}|{{ad.id}}&utm_term={{adset.name}}|{{adset.id}}&placement={{placement}}&site_source_name={{site_source_name}}";

const events: [string, string][] = [
  ["AdClick", "Clique no anúncio (quando há fbclid ou utm_source na URL)"],
  ["PageView", "Carga inicial da página"],
  ["ViewContent", "Página carregada (contentName = título da página)"],
  ["PageError", "Erro de script ou rejeição capturada"],
  ["InitiateCheckout", "Clique em botão de compra (detectado automaticamente)"],
  ["AddToCart / Lead / Purchase", "Disparados manualmente com window.TrackBase.track"],
];

export default function PaginaDoc() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-semibold"><Rocket className="size-6 text-violet-300" />Rastreamento da página de vendas</h2>
        <p className="mt-1 text-sm text-slate-500">Guia completo para você instalar o rastreamento, ativar os UTMs e conectar o Pixel com a Conversions API.</p>
      </div>

      <Card className="metric-card"><CardContent className="space-y-5 p-6">
        <Step n={1} title="Crie um projeto">
          <p className="text-sm leading-6 text-slate-400">Entre em <b className="text-slate-200">Integrações → aba UTMs</b> e crie um projeto informando nome e domínio da página. Cada projeto gera uma <b className="text-slate-200">publicKey</b> única que identifica seus eventos.</p>
        </Step>

        <Step n={2} title="Instale o script de rastreamento">
          <p className="text-sm leading-6 text-slate-400">Copie o snippet gerado e cole <b className="text-slate-200">antes do fechamento de <code className="rounded bg-black/30 px-1 text-violet-300">&lt;/head&gt;</code></b> na sua página de vendas:</p>
          <Code lang="html">{`<script async src="{SEU_DOMINIO}/tracker.js?key={SUA_PUBLIC_KEY}"></script>`}</Code>
          <p className="text-sm leading-6 text-slate-400">Ele é leve, não bloqueia o carregamento e envia os eventos por <code className="rounded bg-black/30 px-1 text-violet-300">sendBeacon</code>.</p>
        </Step>

        <Step n={3} title="Ative os UTMs nos anúncios">
          <p className="text-sm leading-6 text-slate-400">No <b className="text-slate-200">Parâmetros de URL do anúncio</b> (Gerenciador de Anúncios da Meta), cole o template abaixo. A Meta preenche campanha, conjunto, anúncio e posicionamento automaticamente:</p>
          <Code lang="utm">{metaUtm}</Code>
          <Table head={["Parâmetro", "Preenchido com"]} rows={[
            [["utm_campaign"], "Nome da campanha + ID"],
            [["utm_term"], "Nome do conjunto + ID"],
            [["utm_content"], "Nome do anúncio + ID"],
            [["placement"], "Posicionamento"],
            [["site_source_name"], "Facebook ou Instagram"],
            [["utm_medium"], "Tráfego pago"],
          ]} />
          <Box tone="info">É com esses parâmetros que a venda é atribuída à campanha certa. O <code className="rounded bg-black/30 px-1 text-violet-300">fbclid</code> (clique do Facebook) também é capturado automaticamente quando presente.</Box>
        </Step>
      </CardContent></Card>

      <Card className="metric-card"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><MonitorSmartphone className="size-5 text-violet-300" />Eventos capturados</CardTitle></CardHeader><CardContent className="space-y-4">
        <Table head={["Evento", "Quando dispara"]} rows={events.map(([a, b]) => [a, b])} />

        <H3>Checkout (InitiateCheckout)</H3>
        <p className="text-sm leading-6 text-slate-400">O script detecta automaticamente cliques em links/botões cujo texto ou URL contenha <code className="rounded bg-black/30 px-1 text-violet-300">checkout</code>, <code className="rounded bg-black/30 px-1 text-violet-300">comprar</code>, <code className="rounded bg-black/30 px-1 text-violet-300">buy</code> ou <code className="rounded bg-black/30 px-1 text-violet-300">pix</code>. Para controle fino, use o atributo:</p>
        <Code lang="html">{`<button data-trackbase-event="InitiateCheckout" data-value="129.90" data-currency="BRL">
  Comprar agora
</button>`}</Code>

        <H3>Compra (Purchase) — manual</H3>
        <p className="text-sm leading-6 text-slate-400">Dispare no sucesso do pedido (ex.: tela de obrigado):</p>
        <Code lang="javascript">{`// após o pagamento ser confirmado
window.TrackBase.track("Purchase", {
  value: 129.90,
  currency: "BRL",
  contentName: "Kit Bíblico",
  contentIds: ["prod-123"]
});`}</Code>
        <Box tone="ok">A compra também chega pelo webhook do gateway (approval → Purchase) com o mesmo <code className="rounded bg-black/30 px-1 text-violet-300">event_id</code>, sem duplicar.</Box>
      </CardContent></Card>

      <Card className="metric-card"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Radio className="size-5 text-violet-300" />Pixel Meta + Conversions API</CardTitle></CardHeader><CardContent className="space-y-4">
        <Step n={1} title="Crie ou conecte um Pixel">
          <p className="text-sm leading-6 text-slate-400">Na aba <b className="text-slate-200">Pixel &amp; CAPI</b> das Integrações, você pode <b className="text-slate-200">criar um Pixel novo</b> na Meta (informando o Business ID) ou <b className="text-slate-200">conectar um existente</b> (colando o Pixel ID).</p>
        </Step>
        <Step n={2} title="Gere o token CAPI">
          <p className="text-sm leading-6 text-slate-400">No <b className="text-slate-200">Gerenciador de Eventos da Meta</b>, abra o Pixel da conta e gere uma chave de acesso da Conversions API (token completo). Cole-o no campo <b className="text-slate-200">Token de acesso da Conversions API</b>.</p>
        </Step>
        <Step n={3} title="Validar e conectar">
          <p className="text-sm leading-6 text-slate-400">Clique em <b className="text-slate-200">Validar e conectar Pixel + CAPI</b>. O TrackBase valida o Pixel e o token na Meta e passa a enviasi os mesmos eventos por navegador (Pixel) e servidor (CAPI) com o mesmo <code className="rounded bg-black/30 px-1 text-violet-300">event_id</code>.</p>
        </Step>
        <Box tone="warn"><b>Em produção real:</b> faça upload de eventos reais por 30 dias (ou use um <b>código de teste</b> da Meta, ex.: <code className="rounded bg-black/30 px-1 text-violet-300">TEST12345</code>, no campo opcional da conexão) para confirmar o recebimento.</Box>
        <Box tone="info">O token é guardado criptografado (AES-GCM) e usado apenas para enviar eventos ao pixel do seu projeto.</Box>
      </CardContent></Card>

      <Card className="metric-card"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Radio className="size-5 text-violet-300" />Verificando o funcionamento</CardTitle></CardHeader><CardContent className="space-y-4">
        <p className="text-sm leading-6 text-slate-400">Depois de instalar, acesse a página de vendas e confira:</p>
        <ul className="space-y-2 text-sm leading-6 text-slate-400">
          <li>• O <b className="text-slate-200">Dashboard</b> passa a mostrar cliques, acessos, erros, iniciants e compras reais.</li>
          <li>• A página <b className="text-slate-200">Eventos</b> lista PageView, ViewContent, InitiateCheckout e Purchase em tempo real.</li>
          <li>• Em <b className="text-slate-200">Campanhas</b>, o gasto da Meta é cruzado com acessos, ICs, vendas, faturamento e ROAS por campanha.</li>
          <li>• No teste da Meta, use um evento que você mesmo gerou e compare pelo <code className="rounded bg-black/30 px-1 text-violet-300">event_id</code>.</li>
        </ul>
      </CardContent></Card>
    </section>
  );
}