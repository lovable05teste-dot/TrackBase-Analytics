# Revisão do GhostScale (rodada 3: tracking e ferramentas)

Foco: funcionamento básico do rastreamento e das ferramentas.

## Corrigido

1. **Compra sem campanha (crítico de tracking).** Quando o webhook do gateway não trazia UTM ou `fbclid` (caso comum), a venda entrava sem campanha, mesmo com o visitante vindo do anúncio. Agora a rota busca a última visita desse visitante (`tb_vid`) e preenche o que faltou. O que o gateway manda continua tendo prioridade. Também passam a seguir para a Meta o `fbclid`, o `fbc` e o `fbp` da visita. Conferido ao vivo: visita com UTM e `fbclid` no navegador, depois webhook só com `tb_vid`; pedido e evento saíram com campanha, conjunto e anúncio.
2. **ROAS e CPA máximo zeravam com vírgula.** Os campos aceitam o formato brasileiro, mas o cálculo usava `Number()`: `1000,50` virava 0 sem aviso. Agora usam um leitor de número brasileiro (com testes). Conferido: ROAS 3,00x com R$ 3.000,00 / R$ 1.000,50.
3. **CPA máximo com rótulo errado.** O campo de conversão dizia "checkout→compra", mas a fórmula do CPC máximo usa conversão de clique até a compra. Rótulo corrigido.
4. **UTM Builder quebrava as variáveis do Meta.** O `URLSearchParams` codificava `{{campaign.name}}` e o `|`, e a Meta não substituía as variáveis. Agora ficam sem codificar.
5. **Webhook do gateway sem `order_id`.** O campo `order_id` (comum) não era reconhecido, e cada reenvio criava pedido novo (venda duplicada). Corrigido em rodada anterior, conferido ao vivo nesta.

## Verificado e funcionando

- Tracker no navegador (página de teste na mesma origem): `PageView`, `ViewContent`, `AdClick` e `InitiateCheckout` saem com UTM, `fbclid` e `fbc`. Não há erro de página.
- Todas as 40 páginas logadas e de ferramentas carregam sem erro de página.
- Mapa de Links: adiciona, salva, recarrega e mantém.
- Checklist: marca, salva e mantém depois de recarregar.
- Offer Lab: carrega e tem o botão de criar.
- CPA máximo: R$ 197 × 70% = R$ 137,90; CPC máximo R$ 4,14 (confere).

## Limites desta verificação

- **Envio à Meta (CAPI) não foi confirmado.** O sandbox não tem internet, então a chamada à Meta retorna `status 0`. O que foi conferido é que a compra entra na fila com a atribuição certa.
- Monitor de sites, lista negra, tráfego inválido e anti-clone não foram testados de ponta a ponta (dependem de sites externos ou de tráfego real).
- Nomes de campanha e ativador do TikTok só foram carregados, não testados por interação.

## Continua pendente (de rodadas anteriores)

- Rotas de leitura de dados não exigem plano ativo (decisão de produto).
- Segredo do Cakto aceito dentro do corpo do webhook (decidir após confirmar a assinatura em produção).
- Token do webhook na URL (`?token=`) fica em logs; trocar quebra integrações que já usam essa forma.
- Diferença de data entre Campanhas (criação do pedido) e dashboard (data de pagamento).

---

# Revisão do GhostScale (rodada 2)

Revisão de correção, segurança e acabamento das funções logadas. Landing e páginas públicas não foram alteradas. OAuth da Meta, redirect URI e variáveis de ambiente não foram tocados.

## Números

| Verificação | Início da rodada | Agora |
|---|---|---|
| `npx tsc --noEmit` | ok | ok |
| ESLint (`app components lib`) | 0 erros, 36 avisos | **0 erros, 17 avisos** |
| `npm test` | 71 passam, 2 falham (precisam de `dist/`) | **81 passam, 0 falham** |
| `npx next build` | ok | ok |

Os 17 avisos restantes: 6 de `setState` dentro de efeito e 11 de `<img>`. Os de `<img>` são da landing e das páginas públicas (fora do escopo) e das logos de conexões (ver abaixo). Os de `setState` estão listados em "Não feito".

## Itens da lista, situação e como foi verificado

| # | Item | Situação | Verificação |
|---|---|---|---|
| 1 | `/api/health` expõe erro do banco | **Feito.** Resposta pública só com status; detalhe vai para o log | Resposta ao vivo sem detalhes internos; código HTTP igual |
| 2 | Erro cru em 500 | **Feito.** Helper `internalError` (log + mensagem genérica) em 5 rotas: dashboard, Meta campanhas, Meta ações, cron da Meta, TikTok campanhas | Grep sem `error.message` em respostas 500; mensagens 400/401/403 mantidas |
| 3 | Dependências da campanha | **Feito** (rodada anterior, reconfirmado) | No navegador: troca de datas personalizadas gera requisição com `start`/`end` |
| 4 | Dependências do Meta Lab | **Feito** (rodada anterior, reconfirmado) | No navegador: cada requisição aparece uma vez, sem loop |
| 5 | Taxa por gateway e reembolso | **Feito.** Taxa própria por gateway (opcional, padrão = taxa geral). Receita líquida nas Campanhas da Meta e no TikTok (reembolso e chargeback saem). TikTok passa a descontar os custos | Testes de custo por gateway e de receita líquida; código revisado. **Não testei o editor de taxas no navegador** |
| 6 | Cache do dashboard | **Feito.** Cache de 30 s por consulta; botão de atualizar limpa | No navegador: voltar a um período já visto não refaz `/api/dashboard` nem `/api/meta/campaigns` |
| 7 | Polling | **Feito.** `startPolling`: pausa com aba oculta, backoff exponencial até 5 min, para ao desmontar | 4 testes com relógio falso (intervalo, backoff, pausa, parada) |
| 8 | `setState` em efeito | **Parcial.** 13 → 6. Corrigidos: eventos, vendas, chat, feedback, sino, tema, preferências de som | Lint; testes manuais de chat (envia e persiste após recarregar), feedback e tema |
| 9 | `<img>` → `next/image` | **Feito no app logado** (logos, miniaturas, Pix e QR Code com `unoptimized`) | Dashboard e menus com logos corretas; sem rolagem horizontal |
| 10 | Variáveis não usadas | **Feito.** 0 avisos de variável não usada | Lint |
| 11 | `fetch` sem tratamento em efeito | **Já estava tratado** na maioria. `theme-toggle` não faz `fetch` | Revisão de código |
| 12 | `as any` | **Não existia** em app, lib, components ou db (a busca só achou um comentário) | Grep |
| 13 | Validar webhooks | **Feito.** Gateway: valor ausente ou ilegível vira pedido com nota "revisar" (não é rejeitado, para não perder venda por reenvio). Cakto: schema zod do evento depois da autenticação | Testes de leitura de valor e de nota; ao vivo: webhook sem valor gravou `0` com nota, webhook com valor gravou limpo |
| 14 | `dangerouslySetInnerHTML` | **Feito.** O do `chart.tsx` (sem uso) foi removido. O do layout é texto fixo | Build |
| 15 | `npm test` sem build | **Feito.** Testes de `dist/` em `npm run test:dist` | `npm test`: 81 passam |
| 16 | Testes de lucro, reembolso e webhook | **Feito.** `applyCosts` com taxa por gateway, receita líquida, leitura de valor e nota de revisão, horário de pagamento | Testes passam |
| 17 | Estados de carregamento, vazio e erro | **Parcial.** `ErrorPanel` no dashboard; `EmptyPanel` criado mas ainda não usado em outras telas; `LoadingState` já existia | Renderização no navegador |

Um achado extra da verificação ao vivo: o webhook do gateway não reconhecia `order_id` como ID do pedido. Cada reenvio com corpo diferente criava um pedido novo (venda duplicada). Corrigido.

## Visual

- Modo claro e escuro do dashboard: conferidos no navegador, sem erro de página.
- Celular (390 px): sem rolagem horizontal.
- Botão de tema alterna a classe `dark` corretamente.
- Ajuste feito: o rótulo "Som da venda" foi tentado com `truncate` e voltou ao texto original (cortava o nome).
- CSS: não encontrei classes sem uso em `app/dashboard.css` (cada uma aparece em algum componente). Não fiz uma análise de regras duplicadas dentro do arquivo.

## Não feito, e por quê

- **6 `setState` em efeito** (Campanhas, Meta Lab em 3 pontos, regras de rastreamento, cache de plano). A mesma função serve ao carregamento inicial e ao botão de atualizar (Campanhas e Meta Lab), ou reage à troca de projeto. Remover o aviso exige refatorar o fluxo de dados dessas telas; fazer isso às pressas pode quebrar atualização e troca de projeto. O cache de plano começaria com um valor que pode divergir da hidratação.
- **`<img>` das páginas públicas e da landing**: fora do escopo.
- **`<img>` das logos de conexões**: o `src` pode vir vazio, e o `next/image` recusa isso. Precisa de um fallback antes de trocar.
- **Equipe** continua placeholder (convites são feature, não ajuste).

## Riscos e pontos para você conferir

- **Diferença de data entre telas:** Campanhas (Meta e TikTok) filtram pedidos pela data de criação; o dashboard filtra eventos pela data de pagamento. Pedidos que cruzam a virada do período podem aparecer em dias diferentes. A receita líquida é a mesma nas duas telas quando o período não cruza essa virada.
- **Taxa por gateway no dashboard:** a taxa é aplicada sobre as vendas por gateway (pedidos), e o faturamento usado é o dos eventos. Num período com diferença de data, o lucro pode ficar com centavos de diferença. Com filtro de produto, o dashboard usa a taxa geral (o produto só existe no payload do evento).
- **Pedidos marcados "revisar"** continuam contando nas vendas e na receita (com valor 0 ou sem ID). Decisão tomada para não perder venda; quem decide se corrige é você, no gateway.
- **Cakto:** o valor usa o preço do plano quando não vem no webhook. É um padrão explícito e foi mantido.
- **Migração:** a coluna `review_note` é criada sozinha no primeiro acesso após o deploy (`ALTER ... IF NOT EXISTS`).
- **Não testei no navegador:** o editor de taxas por gateway, a tela de Campanhas com taxas por gateway e o widget de custos do TikTok. Foram cobertos por testes unitários e revisão de código.
- **Os conectores do GitHub e da Vercel** ficaram instáveis durante a rodada. Os commits foram enviados por git, o PR não foi aberto (não foi pedido), e o deploy não foi conferido na Vercel.
