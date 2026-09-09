import { BookOpen, KeyRound, PlugZap, Radio, RefreshCcw, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Box, Code, H3, Table } from "../components";

const BASE_URL = "{BASE_URL}";

export default function GatewaysDoc() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-semibold"><PlugZap className="size-6 text-violet-300" />Integração para gateways</h2>
        <p className="mt-1 text-sm text-slate-500">Envie pedidos do seu gateway para o TrackBase e veja as vendas atribuídas às campanhas do Meta Ads.</p>
      </div>

      <Card className="metric-card"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><PlugZap className="size-5 text-violet-300" />Visão geral</CardTitle></CardHeader><CardContent className="space-y-4">
        <p className="text-sm leading-6 text-slate-400">Ao enviar pedidos para o webhook abaixo, cada pagamento vira um evento na Meta com <b className="text-slate-200">event_id</b> para deduplicação: aprovado → <b className="text-slate-200">Purchase</b>, além de pendentes, reembolsos, cancelamentos e chargebacks, tudo no painel do cliente.</p>
        <Code lang="http">{`POST ${BASE_URL}/api/webhooks/gateway
Authorization: Bearer tb_live_<seu-token>
Content-Type: application/json`}</Code>
        <Box tone="info">O webhook aceita formatos livres — os campos são detectados por heurística. O <code className="rounded bg-black/30 px-1 text-violet-300">{BASE_URL}</code> é o domínio do TrackBase do cliente, fornecido no painel.</Box>
      </CardContent></Card>

      <Card className="metric-card"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><KeyRound className="size-5 text-violet-300" />Onde o cliente obtém a credencial</CardTitle></CardHeader><CardContent className="space-y-4">
        <p className="text-sm leading-6 text-slate-400">No painel, em <b className="text-slate-200">Integrações → aba Gateways</b>, o cliente cria uma credencial por gateway e recebe o token <code className="rounded bg-black/30 px-1 text-violet-300">tb_live_...</code> — exibido <b className="text-amber-300">uma única vez</b>.</p>
        <Table head={["Valor", "Exemplo", "Uso"]} rows={[
          [["URL do webhook"], [`${BASE_URL}/api/webhooks/gateway`], "Endpoint para enviar os pedidos"],
          [["Token"], ["tb_live_<64 hex>"], "Enviado como Authorization Bearer"],
          [["Authorization header"], ["Bearer tb_live_<64 hex>"], "Completo, pronto para colar"],
        ]} />
        <p className="text-sm text-slate-400">No seu painel, ofereça ao cliente dois campos: <b className="text-slate-200">URL do webhook</b> e <b className="text-slate-200">Chave de API</b>.</p>
      </CardContent></Card>

      <Card className="metric-card"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-5 text-violet-300" />Autenticação</CardTitle></CardHeader><CardContent className="space-y-4">
        <p className="text-sm leading-6 text-slate-400">O token é aceito em três posições equivalentes:</p>
        <Code lang="http">{`# Opção 1 — header Authorization (recomendado)
Authorization: Bearer tb_live_<64 hex>

# Opção 2 — header X-TrackBase-Key
X-TrackBase-Key: tb_live_<64 hex>

# Opção 3 — query string
POST ${BASE_URL}/api/webhooks/gateway?token=tb_live_<64 hex>`}</Code>
        <Box tone="danger">Sem token, token inválido ou desativado, a resposta é <b>401</b>. O token fica no TrackBase apenas como hash SHA-256.</Box>
      </CardContent></Card>

      <Card className="metric-card"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><BookOpen className="size-5 text-violet-300" />Payload aceito (JSON livre)</CardTitle></CardHeader><CardContent className="space-y-4">
        <p className="text-sm leading-6 text-slate-400">Os valores são procurados nos caminhos abaixo, na ordem indicada. Campos ausentes têm padrões seguros.</p>

        <H3>Identificação</H3>
        <Table head={["Campo", "Caminhos aceitos (primeiro encontrado vence)"]} rows={[
          [["ID do pedido"], ["id", "transaction_id", "transactionId", "sale_id", "saleId", "data.id", "data.transaction.id", "order.id"]],
          [["ID do evento"], ["event_id", "eventId", "tracking.event_id", "metadata.event_id", "data.event_id"]],
        ]} />

        <H3>Status e valores</H3>
        <Table head={["Campo", "Caminhos aceitos", "Padrão"]} rows={[
          [["Status"], ["status", "event", "type", "data.status", "data.transaction.status", "order.status"], "pending"],
          [["Valor"], ["amount", "value", "total", "price", "data.amount", "data.value", "data.transaction.amount", "order.total"], "0"],
          [["Moeda"], ["currency", "data.currency", "data.transaction.currency"], "BRL"],
        ]} />
        <Box tone="warn"><b>Regra de centavos:</b> se o valor for inteiro e maior que 10000, ele é dividido por 100 — <code className="rounded bg-black/30 px-1 text-violet-300">4990</code> vira <b>49.90</b>.</Box>

        <H3>Rastreamento (atribuição da campanha)</H3>
        <p className="text-sm leading-6 text-slate-400">Repasse o que vier do navegador do cliente em <code className="rounded bg-black/30 px-1 text-violet-300">tracking</code>, <code className="rounded bg-black/30 px-1 text-violet-300">metadata</code> ou <code className="rounded bg-black/30 px-1 text-violet-300">data</code>:</p>
        <Table head={["Campo", "Caminhos aceitos"]} rows={[
          [["fbclid"], ["fbclid", "tracking.fbclid", "metadata.fbclid"]],
          [["fbc"], ["fbc", "tracking.fbc", "metadata.fbc"]],
          [["fbp"], ["fbp", "tracking.fbp", "metadata.fbp"]],
          [["utm_source"], ["utm_source", "tracking.utm_source", "metadata.utm_source"]],
          [["utm_campaign"], ["utm_campaign", "tracking.utm_campaign", "metadata.utm_campaign"]],
          [["utm_medium"], ["utm_medium", "tracking.utm_medium", "metadata.utm_medium"]],
          [["utm_content"], ["utm_content", "tracking.utm_content", "metadata.utm_content"]],
          [["utm_term"], ["utm_term", "tracking.utm_term", "metadata.utm_term"]],
        ]} />
      </CardContent></Card>

      <Card className="metric-card"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Radio className="size-5 text-violet-300" />Status → evento</CardTitle></CardHeader><CardContent className="space-y-4">
        <Table head={["Status do seu gateway", "Status TrackBase", "Evento na Meta"]} rows={[
          [["approved", "paid", "completed", "succeeded", "success", "aprovado", "pago"], "approved", "Purchase"],
          [["qualquer outro / ausente"], "pending", "PaymentPending"],
          [["refund", "refunded", "reembolso"], "refunded", "Refund"],
          [["chargeback", "contestado"], "chargeback", "Chargeback"],
          [["cancel", "cancelled", "failed", "recusado", "expired"], "cancelled", "PaymentCancelled"],
        ]} />
        <Box tone="info">Reenvie o mesmo <code className="rounded bg-black/30 px-1 text-violet-300">id</code> quando o pedido mudar de estado (pending → approved, approved → refunded...): o pedido é atualizado e o novo evento registrado.</Box>
      </CardContent></Card>

      <Card className="metric-card"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><BookOpen className="size-5 text-violet-300" />Exemplos</CardTitle></CardHeader><CardContent className="space-y-6">
        <H3>Simples</H3>
        <Code lang="json">{`{
  "id": "8788221",
  "status": "approved",
  "amount": 129.90,
  "currency": "BRL"
}`}</Code>
        <H3>Aninhado (transação)</H3>
        <Code lang="json">{`{
  "data": {
    "transaction": {
      "id": "tran_ABC123",
      "status": "paid",
      "amount": 4990,
      "currency": "BRL"
    }
  }
}`}</Code>
        <H3>Completo (com rastreamento)</H3>
        <Code lang="json">{`{
  "id": "75a1d0d1-9b2f-4c6a-8f0e-1b2c3d4e5f60",
  "status": "approved",
  "amount": 299.00,
  "currency": "BRL",
  "customer": { "email": "cliente@example.com" },
  "tracking": {
    "event_id": "a94a8fe5ccb19ba61c4c0873d391e987",
    "utm_source": "facebook",
    "utm_medium": "paid",
    "utm_campaign": "oferta-inverno|2384729384",
    "utm_content": "anuncio-a|2384729385",
    "utm_term": "conjunto-b|2384729386",
    "fbclid": "IwAR1vx...",
    "fbp": "fb.1.1668373967365.1976397361"
  }
}`}</Code>
        <H3>Teste via cURL</H3>
        <Code lang="bash">{`curl -X POST "${BASE_URL}/api/webhooks/gateway" \\
  -H "Authorization: Bearer tb_live_<seu-token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "id": "pedido-9999",
    "status": "approved",
    "amount": 129.90,
    "currency": "BRL",
    "tracking": {
      "utm_source": "facebook",
      "utm_campaign": "campanha-x|2384729384",
      "fbclid": "IwAR1...",
      "fbp": "fb.1.1668373967365.1976397361"
    }
  }'`}</Code>
      </CardContent></Card>

      <Card className="metric-card"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Radio className="size-5 text-violet-300" />Respostas e códigos HTTP</CardTitle></CardHeader><CardContent className="space-y-4">
        <Table head={["Código", "Significado", "Corpo"]} rows={[
          ["200", "Evento registrado (pedido inserido ou atualizado)", ["{ \"received\": true, \"orderId\", \"status\", \"event\" }"]],
          ["400", "JSON inválido", ["{ \"error\": \"JSON inválido\" }"]],
          ["401", "Token ausente / inválido / desativado", ["{ \"error\": \"Credencial ausente\" } / \"Credencial inválida\""]],
        ]} />
        <Box tone="info">CORS aberto a qualquer origem; preflight <code className="rounded bg-black/30 px-1 text-violet-300">OPTIONS</code> suportado.</Box>
      </CardContent></Card>

      <Card className="metric-card"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><RefreshCcw className="size-5 text-violet-300" />Idempotência e reenvios</CardTitle></CardHeader><CardContent className="space-y-4">
        <Table head={["Cenário", "Comportamento"]} rows={[
          ["Mesmo id com mesmo status reenviado", "Pedido atualizado; evento duplicado ignorado"],
          ["Mesmo id com status novo (ex.: pending → approved)", "Pedido atualizado e novo evento registrado"],
          ["Retry da sua fila após falha", "Seguro — sem duplicação"],
        ]} />
        <Box tone="ok">Reenvios em caso de falha de rede ou 5xx são seguros: a operação é idempotente.</Box>
      </CardContent></Card>
    </section>
  );
}