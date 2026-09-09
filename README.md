# TrackBase Analytics

Painel de inteligência para tráfego pago do **Meta Ads** (Facebook e Instagram). Ele une três camadas de dados em um só lugar:

1. **Rastreamento no navegador** — script leve que captura clique do anúncio, PageView, ViewContent, InitiateCheckout e Purchase com UTMs, `fbclid`, `fbp`/`fbc` e `visitor_id`.
2. **Conversions API (CAPI) da Meta** — os mesmos eventos enviados do navegador são reenviados via servidor com o mesmo `event_id`, garantindo **deduplicação** no Pixel.
3. **Vendas dos gateways** — webhook universal que recebe pedidos de FortPay, FlevoPay, Hotmart, Kiwify, Utmify ou qualquer outro gateway (via credencial API), convertendo aprovados em **Purchase**, e também pendentes, reembolsos, cancelamentos e chargebacks.
4. **Marketing API da Meta** — gasto, impressões, cliques, CPC/CPM por campanha, cruzados com os eventos rastreados para calcular **vendas, faturamento e ROAS** por campanha.

---

## Como o rastreamento funciona

```
┌─────────────────────────┐        ┌─────────────────────────────┐
│ Página de vendas        │        │  Gateway de pagamento       │
│ <script src="/tracker.js│        │  (FortPay, Hotmart, etc.)   │
│  ?key=PROJECT_KEY">     │        │                             │
│  • AdClick / PageView   │        │  Webhook POST com a venda   │
│  • ViewContent          │        │  → /api/webhooks/gateway    │
│  • InitiateCheckout     │        │  (Bearer token)             │
│  • Purchase (manual)    │        └───────────┬─────────────────┘
└───────────┬─────────────┘                    │
            │ sendBeacon                        ▼
            ▼                           ┌───────────────┐
     ┌───────────────┐  evento        → │  orders       │
     │ /api/events   │  ───────────────│  + events      │
     │ (valida key)  │                 └───────────────┘
     └───────┬───────┘                        │
             │ repasse com event_id           │   vendas
             ▼                                ▼
   ┌─────────────────────┐           ┌─────────────────┐
   │ Meta CAPI (Pixel)   │           │ Dashboard       │
   │ v25.0/{pixel}/events│           │ ├── Forecast    │
   └─────────────────────┘           │ ├── Campanhas   │
                    ▲                │ └── Vendas      │
        Marketing API │              └─────────────────┘
   ┌─────────────────┴───────────┐
   │ /api/meta/campaigns         │  gasto + cliques + ROAS
   │ (OAuth contas Meta)         │
   └─────────────────────────────┘
```

### Eventos rastreados

| Evento | Disparo |
|---|---|
| `AdClick` | Presença de `fbclid` ou `utm_source` na URL de entrada |
| `PageView` | Carga inicial da página |
| `ViewContent` | `DOMContentLoaded` (com `contentName = <title>`) |
| `PageError` | `window.onerror` / `unhandledrejection` |
| `InitiateCheckout` | Automático em links/botões contendo `checkout`, `comprar`, `buy` ou `pix`, ou com atributo `data-trackbase-event`. Também disparável manualmente |
| `AddToCart`, `Purchase`, `Lead` | Manuais via `window.TrackBase.track(...)` |

### Deduplicação

- **Browser ⇄ CAPI**: o mesmo `event_id` é enviado pelo navegador e pelo servidor; a Meta descarta duplicados por `event_id`.
- **Eventos no banco**: índice único `(project_id, event_id)` — reenvio do mesmo evento é ignorado.
- **Pedidos de gateway**: índice único `(provider, external_id)` — reenvio do mesmo pedido atualiza o status em vez de duplicar.

---

## Stack

- **Next.js 16 (App Router)** + **React 19** + **Tailwind CSS 4** + shadcn UI
- **Drizzle ORM** + **Postgres (Neon)** — schema em `db/schema.ts`, provisionamento automático das tabelas via `ensureDb()` (`db/index.ts`)
- **Cloudflare (Vinext)** para build e runtime nas rotas de API
- **Graph API da Meta** (versão configurável, padrão `v25.0`)
- Criptografia **AES-GCM** para tokens (Pixel/CAPI e contas Meta)

---

## Pré-requisitos

- Node.js `>=22.13.0`
- Banco Postgres (Neon) — a conexão é lida de `DATABASE_URL` (ou `POSTGRES_URL` / `STORAGE_DATABASE_URL` / `STORAGE_POSTGRES_URL`)

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | String de conexão do banco Postgres (Neon) |
| `TRACKBASE_ENCRYPTION_KEY` | Sim | Chave usada para cifrar tokens (Pixel/CAPI e contas Meta) com AES-GCM |
| `ADMIN_PASSWORD` | Sim | Senha de acesso ao painel (usada no `/login` e no cookie `tb_session`) |
| `META_APP_ID` | Para OAuth | App ID do app na Meta for Developers |
| `META_APP_SECRET` | Para OAuth | App Secret do app na Meta for Developers |
| `META_LOGIN_CONFIG_ID` | Opcional | ID de _Login Config_ (fluxo avançado de Login da Meta) |
| `META_GRAPH_VERSION` | Opcional | Versão da Graph API (padrão `v25.0`) |
| `SECURE_COOKIES` | Opcional | `true` força cookie `Secure`; em produção já é aplicado automaticamente |

> `UTMIFY_WEBHOOK_SECRET` está listado no `.env.example` como paiu reservado. A autenticação de webhooks hoje é feita pelo **token da credencial** (`tb_live_...`), não por um secret fixo.

## Comandos

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (Vite/Vinext) |
| `npm run build` | Build do artefato de produção (Next) |
| `npm run start` | Executa o build |
| `npm test` | Build + testes de metadados renderizados (`tests/*.test.mjs`) |
| `npm run lint` | ESLint |
| `npm run db:generate` | Gera migrations Drizzle após mudanças no schema |

---

## Autenticação do painel

- **Login por senha**: `POST /api/auth/login` com `{ password }` (comparado a `ADMIN_PASSWORD`). Define o cookie `tb_session` (HttpOnly, `SameSite=Lax`, 30 dias). Logout: `GET /api/auth/logout`.
- **OpenAI/GPT workspaces**: quando servido em contexto OpenAI, o usuário é identificado pelos headers `oai-authenticated-user-id` / `oai-authenticated-user-email` (helper em `app/chatgpt-auth.ts`).
- **Derivação de workspace**: `ws_` + `sha256(userId)[0:24]`. Usuário e equipe são isolados por esse workspace.

---

## API — endpoints

| Método(s) | Endpoint | Descrição | Autenticação |
|---|---|---|---|
| `POST` | `/api/auth/login` | Login por senha | pública |
| `GET` | `/api/auth/logout` | Encerra sessão | pública |
| `GET/POST` | `/api/projects` | Listar / criar projetos (gera `publicKey`, `webhookSecret` e snippet) | painel |
| `GET/POST` | `/api/credentials` | Listar / criar credenciais de gateway (gera token `tb_live_...`, URL do webhook e `Authorization`) | painel |
| `GET/POST` | `/api/meta/accounts` | Listar / vincular ou desvincular contas de anúncio | painel |
| `GET` | `/api/meta/oauth/start` | Inicia OAuth no Facebook (escopos `ads_read`, `ads_management`, `business_management`) | painel |
| `GET` | `/api/meta/oauth/callback` | Troca `code` por token (curto → longo), importa contas | pública (validada por `state`) |
| `GET` | `/api/meta/campaigns?period=` | Insights de campanhas + gasto diário + cruzamento com eventos (ROAS) | painel |
| `POST` | `/api/meta/connect` | Valida e conecta Pixel + token CAPI a um projeto (cifra o token) | painel |
| `POST` | `/api/meta/pixel/create` | Cria um Pixel novo na Meta para o Business ID informado | painel |
| `POST`/`OPTIONS` | `/api/events` | Recebe eventos do tracker (`projectKey` + `eventName`); repassa ao CAPI se configurado | `publicKey` do projeto |
| `POST`/`OPTIONS` | `/api/webhooks/gateway` | **Webhook universal de venda** — recebe pedidos do gateway | Bearer token da credencial (ver `docs/gateways.md`) |
| `GET` | `/tracker.js?key=<publicKey>` | Script de rastreamento client-side | pública |

### Exemplo — criar credencial (para gateway)

```bash
POST /api/credentials
Authorization: <cookie de sessão do painel>
Content-Type: application/json

{ "projectId": "<id do projeto>", "name": "FortPay produção", "provider": "fortpay" }
```

Resposta (token exibido **uma única vez**):

```json
{
  "credential": {
    "id": "...",
    "name": "FortPay produção",
    "token": "tb_live_<64 hex>",
    "webhookUrl": "https://<seu-app>/api/webhooks/gateway",
    "authorization": "Bearer tb_live_<64 hex>"
  }
}
```

> O token é salvo apenas como **hash SHA-256** no banco. Se perdido, a credencial deve ser recriada.

---

## Documentação (dentro do app)

A documentação é acessível em **`/docs`** (pública, sem login) e também em Markdown no repositório:

| Rota | Público | Arquivo |
|---|---|---|
| `/docs` | Todos | Índice com visão geral e fluxo |
| `/docs/gateways` | Donos de gateway | `docs/gateways.md` |
| `/docs/pagina` | Donos da página de vendas | — |
| `/docs/faq` | Todos | — |

Atalhos no painel: menu lateral (Dashboard → **Documentação**), botão **Docs** no header e botão **Documentação de integração** em Integrações.

## Integração de gateways

Documento completo para donos de gateways (FortPay, Hotmart, Kiwify, Utmify e outros):

▶ **`docs/gateways.md`**

Resumo rápido:

- **Endpoint:** `POST {BASE_URL}/api/webhooks/gateway`
- **Autenticação:** `Authorization: Bearer <token>` (ou `X-TrackBase-Key: <token>` ou `?token=<token>`)
- **Formato:** JSON livre — campos são detectados por heurística (`id`, `transaction_id`, `amount`, `status`, `tracking.utm_*`, `metadata.fbclid` etc.)
- **Resposta:** `200 {received: true, orderId, status, event}`

---

## Segurança

- Senha e tokens administrativos: comparados/hashados com SHA-256; sessão em cookie HttpOnly.
- Tokens do Meta (Pixel/CAPI e contas): cifrados com **AES-GCM** sob `TRACKBASE_ENCRYPTION_KEY` antes de persistir.
- Webhook de gateway: exige token ativo da credencial (hash único por token); rejeita com `401` caso ausente/inválido.
- CORS aberto apenas aos endpoints de ingestão (`/api/events`, `/api/webhooks/gateway`) — o painel consome requisições same-origin.

---

## Estrutura do repositório

```
app/
├── api/
│   ├── auth/          # login/logout do painel
│   ├── credentials/   # tokens de gateway
│   ├── events/        # eventos do tracker + repasse CAPI
│   ├── meta/          # OAuth, contas, campanhas, pixel, connect
│   ├── projects/      # projetos de rastreamento
│   └── webhooks/gateway/  # webhook universal de vendas
├── campanhas/         # página de campanhas (client + server)
├── contas-meta/       # página de contas Meta
├── docs/              # documentação pública (/docs)
│   ├── layout.tsx     # nav e shell das páginas de doc
│   ├── components.tsx # Code, Table, Box, Step reutilizáveis
│   ├── page.tsx       # índice de docs
│   ├── gateways/      # guia de integração para donos de gateway
│   ├── pagina/        # guia do dono da página de vendas
│   └── faq/           # perguntas frequentes
├── integracoes/       # setup de Integrações (UTMs, Pixel, Gateways)
├── vendas/ eventos/   # páginas de vendas e eventos
├── tracker.js/        # gera o script de rastreamento
├── chatgpt-auth.ts    # helpers de sign-in ChatGPT (opcional)
├── layout.tsx page.tsx login/ ...
components/ui/         # shadcn UI
db/
├── index.ts           # conexão Postgres + auto-provisionamento das tabelas
└── schema.ts          # schema Drizzle (workspaces, projects, events, orders, credentials, contas Meta)
lib/
├── meta.ts            # config/helpers Graph API
├── trackbase-security.ts  # sha256, AES-GCM, requestUserId
└── utils.ts
docs/gateways.md       # Markdown espelho de /docs/gateways (para quem navega o repo)
```

---

## Observações de produção

- As tabelas são criadas automaticamente na primeira requisição (`ensureDb`), sem necessidade de migration manual; migrations Drizzle existem em `drizzle/`.
- O fluxo OAuth da Meta usa `state` com hash e validade de 10 minutos, e troca o token curto pelo longo (`fb_exchange_token`).
- A página `/tracker.js` é servida com cache público de 5 minutos.