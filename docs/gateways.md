# Guia de Integração para Gateways de Pagamento

**TrackBase Analytics** — receba pedidos pelo nosso webhook universal e veja as vendas do seu usuário no painel de tráfego do Meta Ads, com atribuição por campanha.

Este guia é destinado a **gateways de pagamento e plataformas de vendas** (FortPay, FlevoPay, Hotmart, Kiwify, Utmify e outros) que queiram enviar pedidos para o TrackBase de forma simples e segura.

---

## 1. Visão geral

| Item | Valor |
|---|---|
| Endpoint | `POST {BASE_URL}/api/webhooks/gateway` |
| Autenticação | `Authorization: Bearer <token>` (também aceita `X-TrackBase-Key` ou `?token=`) |
| Formato | `application/json` |
| Ação | Registra a venda, atualiza a campanha e dispara o evento correto na Meta (Purchase, PaymentPending, Refund, Chargeback ou PaymentCancelled) |
| Resposta de sucesso | `200` |

O **`{BASE_URL}`** é o domínio onde o TrackBase está publicado (ex.: `https://seudominio.trackbase.app`). Ele é fornecido no painel junto com o token.

> Nós não exigimos formato fixo de payload: o webhook detecta campos comuns por heurística. Basta enviar `id`, `status`, `amount`/`value` e `currency`, e de preferência os dados de rastreamento (`tracking.*`). Dessa forma a integração funciona com qualquer nomenclatura do seu gateway.

---

## 2. Como o cliente obtém a credencial

O dono da conta, no painel **Integrações → aba "Gateways"**, cria uma credencial por gateway e recebe:

- **URL do webhook** → `{BASE_URL}/api/webhooks/gateway`
- **Token** → `tb_live_<64 caracteres hex>`
- **Authorization header** → `Bearer tb_live_<64 caracteres hex>`

O token é exibido **uma única vez**. Ele fica guardado no TrackBase apenas como hash SHA-256, e o cliente pode criar/reagir credenciais quando quiser.

**Na sua plataforma**, ofereça na configuração do cliente os campos:

```
URL do webhook:  {BASE_URL}/api/webhooks/gateway
Chave de API:    tb_live_...
```

E envie o token como `Authorization: Bearer <token>` no header da requisição, ou como `X-TrackBase-Key: <token>`.

---

## 3. Autenticação

O webhook aceita o token em **três posições** (todas equivalentes):

```http
# Opção 1 — header Authorization (recomendado)
Authorization: Bearer tb_live_<64 hex>

# Opção 2 — header X-TrackBase-Key
X-TrackBase-Key: tb_live_<64 hex>

# Opção 3 — query string
POST {BASE_URL}/api/webhooks/gateway?token=tb_live_<64 hex>
```

Quando o token estiver ausente, inválido ou desativado, a resposta é `401`.

Se o seu painel permite configurar **apenas uma URL** (sem header custom), mantenha o token fixo em `X-TrackBase-Key` sempre que possível; caso contrário, use a query `?token=`.

---

## 4. Payload aceito

O JSON é livre. O TrackBase procura os valores nos caminhos abaixo (na ordem indicada, da esquerda para a direita). Envie o que fizer sentido para o seu gateway — campos ausentes têm padrões seguros.

### 4.1 Identificação do pedido

| Campo | Caminhos aceitos (primeiro encontrado vence) |
|---|---|
| ID do pedido | `id` · `transaction_id` · `transactionId` · `sale_id` · `saleId` · `data.id` · `data.transaction.id` · `order.id` |
| ID do evento | `event_id` · `eventId` · `tracking.event_id` · `metadata.event_id` · `data.event_id` |

Se não enviar um ID, o TrackBase gera um automaticamente. O `event_id` é usado para **deduplicação** — se ele não for enviado, o TrackBase monta um estável como `gw_<provider>_<orderId>_<status>`.

### 4.2 Status da transação

| Campo | Caminhos aceitos |
|---|---|
| Status | `status` · `event` · `type` · `data.status` · `data.transaction.status` · `order.status` |

### 4.3 Valores

| Campo | Caminhos aceitos | Padrão |
|---|---|---|
| Valor | `amount` · `value` · `total` · `price` · `data.amount` · `data.value` · `data.transaction.amount` · `order.total` | `0` |
| Moeda | `currency` · `data.currency` · `data.transaction.currency` | `BRL` |

> **Regra de centavos:** se o valor for maior que `10000` e um número inteiro, ele é interpretado como **centavos** e dividido por 100. Ou seja, `12990` vira `R$ 129,90`. Se sua API já envia valores decimais (`129.90`), nenhuma conversão é feita.

### 4.4 Rastreamento (importante para atribuição)

Para o pagamento ser atribuído à **campanha correta do Meta Ads**, repasse os dados que vieram do navegador do cliente. Os campos do seu checkout podem estar aninhados em `tracking`, `metadata` ou `data`:

| Campo | Caminhos aceitos |
|---|---|
| `fbclid` | `fbclid` · `tracking.fbclid` · `metadata.fbclid` |
| `fbc` | `fbc` · `tracking.fbc` · `metadata.fbc` |
| `fbp` | `fbp` · `tracking.fbp` · `metadata.fbp` |
| `utm_source` | `utm_source` · `tracking.utm_source` · `metadata.utm_source` |
| `utm_campaign` | `utm_campaign` · `tracking.utm_campaign` · `metadata.utm_campaign` |
| `utm_medium` | `utm_medium` · `tracking.utm_medium` · `metadata.utm_medium` |
| `utm_content` | `utm_content` · `tracking.utm_content` · `metadata.utm_content` |
| `utm_term` | `utm_term` · `tracking.utm_term` · `metadata.utm_term` |

Recomendado: quando o checkout do seu gateway receber `?fbclid=`, `?utm_*`, `_fbp`/`_fbc` (cookies), guarde-os no pedido e devolva no webhook dentro de `tracking`. Ex.:

```json
{
  "id": "pedido-12345",
  "status": "approved",
  "amount": 129.90,
  "currency": "BRL",
  "tracking": {
    "utm_source": "facebook",
    "utm_campaign": "campanha-x|2384729384",
    "fbclid": "IwAR1...",
    "fbp": "fb.1.1668373967365.1976397361",
    "fbc": "fb.1.1668373967365.IwAR1..."
  }
}
```

---

## 5. Mapeamento de status → evento

A seguir a conversão automática. A detecção é feita por **palavra-chave** no status em minúsculas:

| Status do seu gateway (exemplos) | Status TrackBase | Evento gerado |
|---|---|---|
| `approved`, `paid`, `completed`, `succeeded`, `success`, `aprovado`, `pago` | `approved` | `Purchase` |
| `pending`, `processing`, `waiting`, `analysing`, … (qualquer outro) | `pending` | `PaymentPending` |
| `refunded`, `refund`, `reembolso` | `refunded` | `Refund` |
| `chargeback`, `contestado` | `chargeback` | `Chargeback` |
| `cancelled`, `cancel`, `failed`, `recusado`, `expired` | `cancelled` | `PaymentCancelled` |

**Observações:**

- Se não enviar o status (ou ele não for reconhecido), o pedido entra como `pending` (`PaymentPending`).
- Um mesmo pedido pode **mudar de status** ao longo do tempo. Reenvie o mesmo `id` com o novo status: o pedido existente é **atualizado** (upsert) e o novo estado vira um evento. Email de aprovação posterior a um pagamento pendente funciona perfeitamente.
- Em `Purchase`, o valor do pedido também alimenta a **receita** da campanha (e o ROAS) no painel.

---

## 6. Exemplos de payload

#### Formato simples

```json
{
  "id": "8788221",
  "status": "approved",
  "amount": 129.90,
  "currency": "BRL"
}
```

#### Formato aninhado (transação)

```json
{
  "data": {
    "transaction": {
      "id": "tran_ABC123",
      "status": "paid",
      "amount": 4990,
      "currency": "BRL"
    }
  }
}
```

*`4990` inteiro → convertido para `49.90`.*

#### Envio completo (com rastreamento)

```json
{
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
}
```

#### cURL de teste

```bash
curl -X POST "https://{BASE_URL}/api/webhooks/gateway" \
  -H "Authorization: Bearer tb_live_<seu-token>" \
  -H "Content-Type: application/json" \
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
  }'
```

---

## 7. Respostas e códigos HTTP

| Código | Significado | Corpo |
|---|---|---|
| `200` | Evento registrado (pedido inserido ou atualizado) | `{ "received": true, "orderId": "<id>", "status": "approved", "event": "Purchase" }` |
| `400` | JSON inválido no corpo | `{ "error": "JSON inválido" }` |
| `401` | Token ausente / inválido / desativado | `{ "error": "Credencial ausente" }` ou `{ "error": "Credencial inválida" }` |
| `405`/preflight | Métodos não permitidos | — |

### CORS

O endpoint aceita requisições de qualquer origem:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: authorization, x-trackbase-key, content-type
Access-Control-Allow-Methods: POST, OPTIONS
```

Se seu backend precisa passar por CORS (ex.: envio pelo navegador), use o preflight `OPTIONS` normalmente.

---

## 8. Deduplicação e reenvios (idempotência)

| Cenário | Comportamento |
|---|---|
| Mesmo `id` (pedido) reenviado com o **mesmo** status | Pedido atualizado, evento duplicado **ignorado** (chave `project_id + event_id`) |
| Mesmo `id` reenviado com **status novo** (ex.: pending → approved) | Pedido **atualizado** para o novo status e novo evento registrado |
| Webhook duplicado por retry da sua fila | Seguro — sem duplicar eventos graças à deduplicação acima |

Pode reenviar com segurança em caso de falha de rede ou `5xx`; a operação é idempotente.

---

## 9. Boas práticas de integração

1. **Envie assim que a transação mudar de estado** — aprovado, pendente, reembolsado, cancelado e chargeback. Quanto mais estados enviados, mais completo o painel e o funil do cliente.
2. **Reenvie tentativas falhas** com backoff (`Authorization`/token válido) — `2xx` = sucesso; `401` = token inválido (prompe o usuário a gerar um novo).
3. **Preserve os dados de rastreamento** (`tracking.*`, `metadata.*`) recebidos na URL/cookies, devolvendo-os no webhook — é o que conecta a venda à campanha de anúncio.
4. **Envie valores decimais** (ex.: `129.90`) ou inteiros consistentes (centavos) — o TrackBase detecta centavos automaticamente para valores > 10000.
5. **Não envie dados sensíveis** desnecessários. Guardamos o payload inteiro para auditoria, mas o importante mesmo são: `id`, `status`, valor, moeda e rastreamento.
6. **Configure um token por cliente/ambiente**. O cliente pode criar credenciais separadas por gateway (ex.: FortPay produção / FortPay teste), cada uma com seu próprio token.

---

## 10. Fluxo completo para o dono da conta

1. Cria o projeto e instala o script de rastreamento na página (`{BASE_URL}/tracker.js?key=...`).
2. Configura os parâmetros de URL (UTMs) nos anúncios — isso captura `utm_*` e `fbclid`.
3. (Opcional, recomendado) conecta o Pixel + Conversions API.
4. **No seu gateway**: cria a credencial → copia **URL do webhook** e **token** → cola na sua plataforma → ativa o envio de webhooks.
5. Toda venda/status passa a aparecer no painel de Vendas e Campanhas (ROAS).

---