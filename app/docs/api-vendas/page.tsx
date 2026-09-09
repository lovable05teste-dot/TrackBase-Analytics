import { PlugZap } from "lucide-react";
import { Box, Code, H3, Table } from "../components";

export default function ApiVendasDoc() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-semibold"><PlugZap className="size-6 text-violet-300" />API de Vendas</h2>
        <p className="mt-1 text-sm text-slate-500">Endpoint universal para gateways enviarem vendas ao TrackBase.</p>
      </div>
      <Box>
        <H3>POST {"{BASE_URL}"}/api/webhooks/gateway</H3>
        <p>Autenticação: <Code lang="bash">Authorization: Bearer tb_live_...</Code> (ou <Code lang="bash">X-TrackBase-Key</Code> ou <Code lang="bash">?token=</Code>). Gere o token em <a href="/integracoes" className="text-violet-300 underline">Integrações → Gateways</a>.</p>
      </Box>
      <div>
        <H3>Payload</H3>
        <Code lang="json">{`{
  "id": "TX123456",
  "status": "approved",
  "amount": 197.0,
  "currency": "BRL",
  "tracking": {
    "utm_source": "facebook",
    "utm_campaign": "CBO_KIT_01",
    "utm_content": "criativo-03",
    "fbclid": "IwAR..."
  }
}`}</Code>
      </div>
      <div>
        <H3>Status aceitos</H3>
        <Table head={["Status", "Efeito"]} rows={[["approved", "Vira Purchase (faturamento)"], ["pending", "Conta como pendente"], ["refunded / cancelled", "Estorna a venda"], ["chargeback", "Marca chargeback"]]} />
      </div>
      <Box tone="ok">
        <H3>Teste rápido</H3>
        <p>Resposta: <Code lang="json">{`{received:true, orderId, status, event}`}</Code>. Reenvios atualizam o pedido (idempotente por provider + external_id). Teste em <a href="/webhooks" className="text-violet-300 underline">/webhooks</a> ou veja o guia completo em <a href="/docs/gateways" className="text-violet-300 underline">/docs/gateways</a>.</p>
      </Box>
    </section>
  );
}
