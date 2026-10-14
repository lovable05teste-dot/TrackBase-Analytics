# GhostScale: revisão para uso por vários clientes

Base revisada: main em 899e298. Revisão estática das rotas de API, cadastro, sessões, permissões, planos, projetos, conexão Meta/parceiro, ingestão de vendas e testes existentes. Isso não equivale a uma auditoria independente nem comprova produção. Nenhum App ID ou segredo foi alterado nesta revisão.

## Correções propostas neste PR

| Prioridade | Problema encontrado | Correção |
|---|---|---|
| Alta | Nome e ID de conta eram tratados como prova de posse na conexão por parceiro. | Novos vínculos exigem aprovação administrativa vinculada ao usuário. Uma chave única por conta impede duas aprovações simultâneas. Contas existentes permanecem para evitar desligamento; precisam de conferência administrativa. |
| Alta | Rotas autenticadas de alteração não conferiam origem de modo uniforme. | Proteção de origem antes da autenticação e dos efeitos nas rotas de Meta, TikTok, pedidos, regras, notificações, push, checkout e monitores. O POST público do tracker continua público. |
| Alta | Reserva de franquia não incrementava o contador e podia liberar uso acima do limite. | UPDATE condicional com incremento SQL e RETURNING; teste com 25 requisições simultâneas para limite 3. |
| Alta | Contagem de vendas usava leitura seguida de escrita e perdia incrementos concorrentes. | Incremento SQL atômico. |
| Média | Avisos de uso podiam repetir várias vezes ao arredondar a porcentagem. | Envio ao cruzar 80%, 90% e 100%. |
| Média | Cadastro podia gravar workspace sem terminar usuário e membership. | Transação para criar os três registros juntos. |
| Média | Token manual importava somente a primeira página de contas Meta. | Usa o paginador já empregado no OAuth. |
| Média | Inicialização executava DROP TABLE de estados OAuth antigos. | Removida exclusão automática; migrações destrutivas devem ser deliberadas. |
| Média | Ação Meta desconhecida e orçamento não finito não tinham validação explícita. | Lista de ações permitidas e orçamento finito positivo. |
| Média | Salvar Pixel/token era apresentado como comprovação de CAPI ativa. | Mensagem informa que os dados foram salvos e que o primeiro envio valida a conexão. |

## Conta principal e separação de clientes

- Cadastro já gera workspace próprio por usuário; os projetos e contas Meta examinados filtram por esse usuário/workspace.
- A identidade administrativa especial existente foi preservada; não promovemos nem reassociamos usuário por suposição.
- A aprovação de parceiro não fornece acesso ao painel de outro usuário e não revoga conexões existentes.
- O administrador pode aprovar um novo vínculo em `POST /api/admin/meta-partner`, com sessão administrativa e JSON `{ "adAccountId": "ID_DA_CONTA", "userId": "ID_DO_CLIENTE" }`, depois de conferir o compartilhamento e a identidade do cliente. O endpoint não transfere uma conta já aprovada para outro cliente.
- A interface administrativa dessa aprovação ainda precisa ser construída; o endpoint é a proteção inicial, não uma experiência de onboarding completa.

## Melhorias recomendadas, por ordem

1. Conferir manualmente os vínculos de parceiro já existentes e aprová-los; nome e ID não provam autorização histórica.
2. Adicionar uma tela administrativa de clientes e aprovações, com busca, histórico e revogação/transferência deliberada.
3. Testar dois clientes reais em produção: A não pode listar, alterar, remover nem consultar dados de B; validar também tarefas agendadas e notificações.
4. Confirmar qual usuário real é a conta principal antes de alterar privilégios ou mover dados. Não compartilhar o token/sessão dessa conta com clientes.
5. Concluir convites e papéis de equipe. `/equipe` ainda diz que convites chegam em breve. O helper legado converte `member` em `owner`; revisar essa compatibilidade antes de ativar convites.
6. Validar OAuth real com a configuração publicada na Meta, inclusive usuários externos ao app, expiração/revogação e AdsPower. Estes testes não comprovam permissão externa nem o App ID de produção.
7. Tornar explícito na interface: configurado, autorizado, com contas importadas, sincronizando, expirado e falha de envio. Evitar indicadores verdes baseados só em cadastro local.
8. Mover DDL da inicialização para migrações versionadas; testar separadamente o suporte D1, cujo adapter não oferece as mesmas transações de Postgres.
9. Completar idempotência da franquia para sequência aprovado → estornado → aprovado e garantir entrega única dos alertas mesmo com falha de e-mail.
10. Revisar concorrência do limite de criação de projetos, que ainda faz contagem antes de inserir.
11. Adicionar paginação/limites aos relatórios que carregam todos os eventos e controlar concorrência de consultas Meta para clientes com muitas contas.
12. Exercitar backup/restauração, rotação do token compartilhado de parceiro e alertas de filas CAPI, tokens expirados e falhas de cron em ambiente controlado.
13. Atualizar os testes antigos que ainda esperam `dist/server/index.js` e CSS em `dist`, enquanto `npm run build` executa Next.js e produz `.next`.

## Validação

- TypeScript: aprovado.
- Build Next.js: aprovado.
- Suíte completa: 74 testes; 72 aprovados, 2 falhas por dependência de `dist` do formato antigo. Não declarar a suíte inteira verde.
- Três testes novos: reserva concorrente de franquia e isolamento de workspace; parceiro não aprovado recusado antes de usar credenciais compartilhadas; origem conflitante recusada antes dos efeitos nas rotas Meta.
- Testes existentes incluem deduplicação de vendas, CAPI/retries, isolamento de ferramentas, autorização de proteção, UTMs, callback OAuth e paginação Meta.
- Sem banco de produção, sessão do dono ou autorização Meta real usados. As mudanças só entram no site após merge/deploy.
