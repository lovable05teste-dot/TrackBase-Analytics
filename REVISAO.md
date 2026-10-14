# Revisão do GhostScale

Rodada de revisão das telas logadas, APIs e componentes. Sem mudanças grandes de arquitetura, sem alterar a landing, sem tocar em segredos, redirect do OAuth da Meta ou na lógica de lucro (`lib/costs.ts`).

## Estado do projeto

| Verificação | Antes | Depois |
|---|---|---|
| `npx tsc --noEmit` | ok | ok |
| `npx eslint app components lib` | 0 erros, 42 avisos | 0 erros, 36 avisos |
| `npx next build` | ok | ok |
| `npm test` | 66 passam, 2 falham (precisam de `dist/`) | 71 passam, mesmas 2 falhas |

## O que foi corrigido

### Campanhas (`app/campanhas`)
- **Período personalizado não atualizava.** Ao trocar a data inicial ou final, a lista continuava mostrando o intervalo anterior, porque o carregamento só rodava ao trocar o nível ou o período. Agora a busca roda sempre que as datas mudam.
  - Confirmado no navegador: antes da correção, mudar as datas não gerava nenhuma requisição; depois, a requisição sai com `start` e `end`.

### Meta Lab (`app/meta-lab`)
- **Dependências incompletas nos efeitos.** Histórico, contas, públicos e regras rodavam uma vez ao montar, mas usavam funções que não estavam nas dependências. O `useApi` agora memoiza o `load` com `useCallback`, e os efeitos dependem do que usam.
  - Sem a memorização, colocar `load` nas dependências faria a tela buscar em loop. Confirmado no navegador: cada requisição aparece uma vez (`/api/meta/accounts`, `/api/meta/diagnostics`).
- O carregamento de projetos e públicos não depende mais de `projectId` (usa atualização funcional), então não refaz a busca ao escolher um projeto.

### Predict (`app/predict/page.tsx`)
- **Texto com erro.** A sugestão dizia "IC/accesso abaixo de 5%". Trocada por "menos de 5% dos visitantes chegam ao checkout", que descreve a conta feita (checkouts divididos por visitas).

### Player de som (`lib/sale-sounds.ts`, `components/SaleSoundBridge.tsx`)
- **Parâmetros não usados.** `playFromWorker` ignorava `soundId` e `enabled` (sempre usa as preferências salvas). Os parâmetros saíram, e a chamada foi ajustada. Remove 2 avisos de lint.

## O que ficou pendente, e por quê

1. **Lucro do TikTok não aplica os custos.** A aba TikTok calcula lucro como faturamento menos gasto. As campanhas da Meta aplicam os custos de produto, gateway e imposto (`applyCosts`), então o mesmo período pode mostrar lucros diferentes em telas diferentes. **Não corrigi** porque muda a regra de lucro, e você pediu para explicar antes de mexer em `lib/costs.ts`. A correção seria passar a TikTok pelo mesmo `applyCosts`.
2. **Equipe (`app/equipe`) é um placeholder.** A página diz que convites chegam em breve. Implementar convites é uma feature (a tabela `members` existe, falta a API e o fluxo de convite e de e-mail). Fica como pendente de produto.
3. **23 avisos de `<img>`.** Trocar por `next/image` exige liberar os domínios das miniaturas (Meta e CDNs) em `next.config` e conferir cada tela. Não fiz nesta rodada para não arriscar o layout.
4. **13 avisos de `setState` dentro de efeito.** É o padrão de buscar dados ao montar a tela, usado em quase todo o app. Eliminar o aviso exige trocar por um hook de dados ou React Query, uma refatoração maior do que cabe aqui.
5. **ROAS sem gasto aparece de jeitos diferentes.** O diagnóstico da Meta mostra `0` quando não há gasto, enquanto as outras telas mostram `—`. Baixo impacto, mas vale padronizar.
6. **Rotas que devolvem `error.message` ao cliente.** Algumas rotas (por exemplo, a de campanhas do TikTok) mandam a mensagem de erro original no JSON de 500. Hoje isso não expõe segredo, mas o ideal é mensagem genérica no servidor e log do detalhe.

## Riscos conhecidos

- **Tela Clientes (`/clientes`) ainda não testada no fluxo real.** Os nomes dos campos do comprador no webhook (`customer.email`, `buyer.email` etc.) são palpites até chegar um webhook de verdade do gateway.
- **Exclusão de conta não cancela a assinatura.** Quem tem plano ativo precisa cancelar com o suporte antes. Os registros de pagamento ficam guardados por obrigação fiscal.
- **Checagem de origem (CSRF) em 19 rotas.** `/api/events` ficou de fora de propósito (rastreador em sites de clientes), assim como webhooks e callbacks da Meta.
- **Monitor de sites.** A conexão agora valida o IP na hora de conectar. Testado para IP interno e `localhost`; não testado contra um site público de verdade no sandbox.
- **Testes no navegador desta rodada:** Meta Lab (sem loop de requisições) e Campanhas (datas personalizadas). As demais telas foram revisadas por leitura de código e pelo build, não por clique.
