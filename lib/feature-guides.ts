export type FeatureGuide = { href: string; title: string; category: string; summary: string; needs: string; steps: string[]; troubleshoot: string; example: string };
export const FEATURE_GUIDES: FeatureGuide[] = [
  {
    "href": "/",
    "title": "Dashboard",
    "category": "Análise",
    "summary": "Acompanhe vendas confirmadas, receita, gasto e funil.",
    "needs": "Projeto com tracker; gateway conectado; Meta vinculada para importar gastos.",
    "steps": [
      "Escolha o período e os filtros da operação.",
      "Se usar datas personalizadas, clique em Aplicar período.",
      "Compare vendas e receita com o gateway no mesmo período.",
      "Use Atualizar para buscar novos dados."
    ],
    "troubleshoot": "Sem gastos? Vincule uma conta Meta. Sem vendas? Confira o webhook e o status de pagamento.",
    "example": "ROAS = receita ÷ gasto com anúncios. Sem gasto, o resultado fica sem base para cálculo."
  },
  {
    "href": "/projetos/novo",
    "title": "Novo projeto",
    "category": "Configuração",
    "summary": "Separe cada página ou operação em um projeto.",
    "needs": "Nome da operação e endereço da página de vendas.",
    "steps": [
      "Informe o nome que reconhecerá nos relatórios.",
      "Cadastre o domínio da página.",
      "Crie o projeto e abra Integrações para copiar o tracker.",
      "Instale o tracker uma vez na página."
    ],
    "troubleshoot": "A chave pública identifica o projeto. Credenciais de gateway e tokens Meta devem ficar privados.",
    "example": "Um projeto para cada operação que precisa de configuração própria."
  },
  {
    "href": "/seguranca/anti-clone",
    "title": "Anti-Clone",
    "category": "Proteção",
    "summary": "Proteja domínios e controle a abertura da página dentro de outros sites.",
    "needs": "Projeto criado e tracker GhostScale instalado, ou o script de proteção.",
    "steps": [
      "Selecione o projeto e adicione os domínios oficiais, incluindo www quando usado.",
      "Ative a proteção em Observar; escolha a regra de iframe e subdomínios.",
      "Simule seu endereço oficial e um endereço de teste fora da lista.",
      "Salve, abra sua página e confira os diagnósticos.",
      "Quando as regras estiverem corretas, mude para Bloquear e salve."
    ],
    "troubleshoot": "Preview bloqueado? Use Observar para conferir a origem e a regra de iframe. Remova o snippet antigo. Um script removido da cópia deixa de proteger essa cópia.",
    "example": "suaoferta.com.br e www.suaoferta.com.br são entradas distintas quando subdomínios estão desativados."
  },
  {
    "href": "/seguranca/blacklist",
    "title": "Blacklist de IP",
    "category": "Proteção",
    "summary": "Ignore novos eventos de endereços específicos no servidor.",
    "needs": "Projeto criado; plano com blacklist; IPv4 ou IPv6 completo.",
    "steps": [
      "Selecione o projeto correto.",
      "Adicione o IP exato que deseja excluir.",
      "Aguarde a confirmação de salvamento.",
      "Para desfazer, remova o IP da lista."
    ],
    "troubleshoot": "A regra afeta eventos recebidos pelo GhostScale e CAPI. O Pixel instalado no navegador pode continuar enviando seus próprios eventos. Para bloquear o site, use o firewall da hospedagem.",
    "example": "Não inclua :porta nem /máscara. Vendas confirmadas por webhook continuam registradas."
  },
  {
    "href": "/seguranca/trafego-invalido",
    "title": "Tráfego inválido",
    "category": "Proteção",
    "summary": "Investigue erros e diferenças entre cliques e visitas.",
    "needs": "Tracker com eventos recentes.",
    "steps": [
      "Compare cliques com PageViews nos 30 dias exibidos.",
      "Abra Eventos para examinar PageError.",
      "Confira redirecionamentos e carregamento da página.",
      "Use blacklist apenas para endereços que você identificou."
    ],
    "troubleshoot": "Uma diferença entre cliques e visitas não comprova fraude. Pessoas podem gerar vários eventos legítimos.",
    "example": "Os indicadores são sinais para investigar, não uma identificação garantida de bots."
  },
  {
    "href": "/seguranca/monitoramento",
    "title": "Monitoramento de sites",
    "category": "Proteção",
    "summary": "Verifique manualmente se os endereços respondem ao navegador.",
    "needs": "URLs completas da página e do checkout.",
    "steps": [
      "Adicione os endereços e salve na sua conta.",
      "Clique em Verificar agora e aguarde os resultados.",
      "Salve novamente para guardar a verificação.",
      "Abra a página para confirmar conteúdo e funcionamento do checkout."
    ],
    "troubleshoot": "Cada URL tem limite de 8 segundos. Falha pode indicar rede ou bloqueio do navegador; alcançável não confirma HTTP 200. A ferramenta não verifica em segundo plano.",
    "example": "Verifique a página de vendas e o checkout separadamente."
  },
  {
    "href": "/integracoes",
    "title": "Integrações",
    "category": "Configuração",
    "summary": "Conecte as fontes que alimentam a operação.",
    "needs": "Um projeto; acesso ao gateway e à conta Meta.",
    "steps": [
      "Crie ou selecione o projeto.",
      "Copie o script de rastreamento para a página.",
      "Conecte a conta Meta e o Pixel quando aplicável.",
      "Crie uma credencial de gateway e configure o webhook.",
      "Valide PageView, clique de checkout e pagamento confirmado."
    ],
    "troubleshoot": "Instale apenas uma cópia do tracker para cada projeto. Erros de conexão aparecem na integração correspondente.",
    "example": "O tracker mede navegação; o webhook confirma o pagamento."
  },
  {
    "href": "/contas-meta",
    "title": "Contas Meta",
    "category": "Configuração",
    "summary": "Autorize a leitura das contas de anúncio que administra.",
    "needs": "Acesso autorizado à conta no Facebook e permissões do aplicativo.",
    "steps": [
      "Clique em Continuar com Facebook.",
      "Autorize as permissões solicitadas e os negócios corretos.",
      "Ao voltar, selecione a conta de anúncio que deseja vincular.",
      "Abra Campanhas e escolha o período."
    ],
    "troubleshoot": "URL bloqueada depende da configuração OAuth do app Meta. Sem contas na lista? Confira o acesso do perfil ao negócio e à conta.",
    "example": "Vincular uma conta permite importar seus dados; não cria uma campanha."
  },
  {
    "href": "/pixel-capi",
    "title": "Pixel & CAPI",
    "category": "Configuração",
    "summary": "Una os eventos do navegador e do servidor.",
    "needs": "Projeto; Pixel Meta ou conta com permissão para criá-lo; token com acesso ao Pixel.",
    "steps": [
      "Selecione o projeto e conecte o Pixel.",
      "Instale o tracker na página.",
      "Configure InitiateCheckout pelo texto, seletor ou link do botão.",
      "Conecte o webhook para confirmar Purchase.",
      "Confira Eventos no GhostScale e a ferramenta de testes da Meta."
    ],
    "troubleshoot": "Seletor CSS incorreto não identifica o botão. Purchase depende do pagamento confirmado, mesmo quando a página de obrigado abre.",
    "example": "Use texto COMPRAR AGORA, seletor #comprar ou trecho do endereço /checkout."
  },
  {
    "href": "/integracoes/gateways",
    "title": "Gateways",
    "category": "Configuração",
    "summary": "Receba status reais dos pagamentos.",
    "needs": "Projeto; acesso à configuração de webhook do gateway.",
    "steps": [
      "Crie uma credencial vinculada ao projeto.",
      "Guarde o token apresentado na criação.",
      "Configure o endpoint e a autenticação no gateway.",
      "Ative notificações de pagamento aprovado e mudanças de status.",
      "Confira o ID e o status em Vendas."
    ],
    "troubleshoot": "401 indica credencial ausente, incorreta ou revogada. Pix gerado ainda é pendente.",
    "example": "Reenvie o mesmo ID de pedido para atualizar seu status sem criar uma nova venda."
  },
  {
    "href": "/webhooks",
    "title": "Teste de webhook",
    "category": "Configuração",
    "summary": "Envie manualmente um payload ao endpoint escolhido.",
    "needs": "Credencial de um projeto de testes.",
    "steps": [
      "Use a URL do endpoint e o token desse projeto.",
      "Confira o JSON e mantenha um ID de pedido reconhecível.",
      "Comece com status pending.",
      "Envie e leia o código HTTP e a resposta.",
      "Se aprovar o pedido de teste, o envio será processado como uma venda nesse projeto."
    ],
    "troubleshoot": "Esse botão envia uma requisição real. Use projeto de testes para não misturar suas métricas. Rede/CORS e token inválido têm causas diferentes.",
    "example": "200 confirma processamento; 400 pede correção do payload; 401 pede revisão da credencial."
  },
  {
    "href": "/meta-lab",
    "title": "Meta Lab",
    "category": "Análise",
    "summary": "Analise contas e configure regras com critérios explícitos.",
    "needs": "Conta Meta vinculada e permissões para a ação desejada.",
    "steps": [
      "Selecione a conta e abra o diagnóstico.",
      "Para uma regra, defina métrica, condição, janela e gasto mínimo.",
      "Escolha a ação e o intervalo entre execuções.",
      "Use Simular todas e confira o resultado.",
      "Execute só depois de revisar os alvos e acompanhe o histórico."
    ],
    "troubleshoot": "As ações de execução podem alterar anúncios na Meta. Permissões insuficientes ou token expirado impedem a ação.",
    "example": "Uma simulação apresenta os itens afetados sem executar a alteração."
  },
  {
    "href": "/campanhas",
    "title": "Campanhas",
    "category": "Análise",
    "summary": "Compare campanhas, conjuntos e anúncios.",
    "needs": "Conta Meta vinculada; UTMs no tráfego e webhook para atribuir receita.",
    "steps": [
      "Escolha a conta e o nível da análise.",
      "Defina o período.",
      "Compare gasto, cliques, vendas e receita.",
      "Confira avisos de falha por conta antes de comparar totais."
    ],
    "troubleshoot": "Sem vendas atribuídas? Verifique se as UTMs chegam à página e retornam no pagamento.",
    "example": "Compare campanhas usando a mesma moeda e o mesmo período."
  },
  {
    "href": "/vendas",
    "title": "Vendas",
    "category": "Análise",
    "summary": "Confira pedidos e mudanças de status.",
    "needs": "Gateway enviando webhooks com ID, status e valor.",
    "steps": [
      "Selecione os filtros da operação.",
      "Encontre o pedido pelo identificador ou pelo período.",
      "Compare o status com o gateway.",
      "Revise pedidos pendentes separadamente dos aprovados."
    ],
    "troubleshoot": "O webhook pode chegar com atraso. Reenvios devem usar o mesmo ID do pedido.",
    "example": "Gerar Pix cria uma cobrança pendente; a aprovação chega depois da confirmação."
  },
  {
    "href": "/eventos",
    "title": "Eventos",
    "category": "Análise",
    "summary": "Confira o que o tracker está registrando.",
    "needs": "Tracker instalado com a chave do projeto.",
    "steps": [
      "Abra a página em outra aba.",
      "Atualize a lista e procure PageView.",
      "Clique no botão de compra e procure InitiateCheckout.",
      "Use o gateway para verificar Purchase após pagamento."
    ],
    "troubleshoot": "Se não chega PageView, confira a chave, o script, bloqueadores e as regras de domínio.",
    "example": "PageView = visita; InitiateCheckout = início do checkout; Purchase = pagamento confirmado."
  },
  {
    "href": "/funil",
    "title": "Análise de funil",
    "category": "Análise",
    "summary": "Encontre etapas com perda entre visita, checkout e compra.",
    "needs": "Eventos de navegação e pagamentos confirmados.",
    "steps": [
      "Leia os volumes das etapas no período apresentado.",
      "Compare a passagem de visita para checkout.",
      "Compare checkouts com compras.",
      "Abra Eventos para investigar uma etapa sem dados."
    ],
    "troubleshoot": "Eventos são contagens de ocorrências e podem incluir retornos da mesma pessoa. Um funil agregado não reconstrói sozinho toda a jornada.",
    "example": "Pouco InitiateCheckout pode indicar regra de botão incorreta."
  },
  {
    "href": "/relatorios",
    "title": "Relatórios",
    "category": "Análise",
    "summary": "Compare resultados agrupados da sua operação.",
    "needs": "Projetos com eventos e vendas.",
    "steps": [
      "Confira o período exibido.",
      "Compare as fontes e campanhas.",
      "Abra Vendas para investigar divergências.",
      "Use o mesmo período no gateway ao conferir receita."
    ],
    "troubleshoot": "Relatórios só incluem dados recebidos. Instalar hoje não importa visitas antigas.",
    "example": "Mantenha a nomenclatura das campanhas consistente."
  },
  {
    "href": "/relatorios/utms",
    "title": "Relatórios de UTMs",
    "category": "Análise",
    "summary": "Veja resultados por parâmetro de origem.",
    "needs": "UTMs nos anúncios e retorno desses parâmetros no gateway.",
    "steps": [
      "Veja utm_source para a origem.",
      "Compare utm_campaign para campanhas.",
      "Use utm_content para identificar anúncios.",
      "Investigue itens sem marcação no fluxo até o checkout."
    ],
    "troubleshoot": "Um redirecionamento que descarta os parâmetros quebra a atribuição.",
    "example": "utm_source=facebook e utm_medium=paid identificam tráfego pago da Meta."
  },
  {
    "href": "/atribuicao",
    "title": "Atribuição",
    "category": "Análise",
    "summary": "Confira cobertura de UTMs, fbclid e fontes dos eventos.",
    "needs": "Eventos contendo parâmetros de campanha.",
    "steps": [
      "Confira a proporção de PageViews marcados.",
      "Compare origens por utm_source.",
      "Investigue o tráfego direto/sem marcação.",
      "Revise os parâmetros no link final e no webhook."
    ],
    "troubleshoot": "Sem marcação não significa necessariamente tráfego orgânico. Não é um relatório de jornada multitoque.",
    "example": "fbclid e UTMs juntos ajudam a relacionar a visita à origem."
  },
  {
    "href": "/heatmaps",
    "title": "Heatmaps",
    "category": "Análise",
    "summary": "Leia intensidade de eventos por hora UTC e dia.",
    "needs": "Eventos dos últimos 30 dias.",
    "steps": [
      "Confira o volume por hora UTC.",
      "Compare dias da semana.",
      "Leia a quantidade de compras junto do volume.",
      "Veja utm_content para comparar criativos."
    ],
    "troubleshoot": "O mapa atual é temporal. Não grava sessões nem mostra cliques sobre uma imagem da página.",
    "example": "Uma hora com muitos eventos pode ter poucas compras; compare os dois números."
  },
  {
    "href": "/predict",
    "title": "Predict",
    "category": "Análise",
    "summary": "Veja projeções baseadas no histórico recebido.",
    "needs": "Dados de navegação e compras de 7 a 30 dias.",
    "steps": [
      "Confira o volume recente e a tendência.",
      "Compare ticket médio e conversão.",
      "Leia as sugestões junto do tamanho da amostra.",
      "Use a projeção como referência, verificando os resultados reais."
    ],
    "troubleshoot": "O cálculo usa regras e tendência histórica. Não é uma garantia de receita ou recomendação automática de orçamento.",
    "example": "Mudanças de oferta, preço e tráfego podem alterar a projeção rapidamente."
  },
  {
    "href": "/agent-hub",
    "title": "Agent Hub",
    "category": "Planejamento",
    "summary": "Organize modelos para futuras automações.",
    "needs": "Plano com Agent Hub.",
    "steps": [
      "Adicione um modelo ou nomeie sua ideia.",
      "Salve os rascunhos na sua conta.",
      "Abra Meta Lab para configurar a regra executável.",
      "Simule a regra antes de executar."
    ],
    "troubleshoot": "Um modelo salvo no Agent Hub não inicia monitoramento nem altera anúncios. Rascunhos precisam de configuração no Meta Lab.",
    "example": "Use o modelo para registrar condição e ação pretendidas."
  },
  {
    "href": "/offer-lab",
    "title": "Offer Lab",
    "category": "Planejamento",
    "summary": "Organize preço, hook e variações de oferta.",
    "needs": "Nome e preço de cada variação.",
    "steps": [
      "Cadastre as variações.",
      "Salve na sua conta.",
      "Compare os resultados reais da campanha.",
      "Marque a vencedora e salve a decisão."
    ],
    "troubleshoot": "A marcação é manual e não publica alterações na página nem no checkout.",
    "example": "Valores como 19,90 e 19.90 são aceitos."
  },
  {
    "href": "/ferramentas/utm-builder",
    "title": "UTM Builder",
    "category": "Ferramentas",
    "summary": "Monte links com parâmetros de campanha.",
    "needs": "URL final da página.",
    "steps": [
      "Cole o link da página.",
      "Preencha fonte, meio, campanha e identificação do anúncio.",
      "Gere e copie o link.",
      "Abra o endereço e confira os parâmetros até o checkout."
    ],
    "troubleshoot": "Evite trocar os nomes dos parâmetros. O gateway precisa devolvê-los no webhook.",
    "example": "Use uma convenção de nomes por campanha, conjunto e anúncio."
  },
  {
    "href": "/ferramentas/calculadora-roas",
    "title": "Calculadora ROAS/CPA",
    "category": "Ferramentas",
    "summary": "Calcule indicadores a partir dos números informados.",
    "needs": "Gasto, receita e número de vendas do mesmo período.",
    "steps": [
      "Preencha os valores.",
      "Confira o número de vendas.",
      "Leia ROAS e CPA calculados.",
      "Compare com os custos e a margem da operação."
    ],
    "troubleshoot": "Não misture moedas ou períodos. Receita não representa lucro líquido.",
    "example": "ROAS = receita/gasto; CPA = gasto/vendas."
  },
  {
    "href": "/ferramentas/cpa-maximo",
    "title": "CPA máximo",
    "category": "Ferramentas",
    "summary": "Estime o custo por aquisição que cabe na sua margem.",
    "needs": "Preço, custos, taxas e lucro desejado.",
    "steps": [
      "Informe os valores conforme os campos.",
      "Inclua todos os custos relevantes.",
      "Confira o limite calculado.",
      "Revise quando preço ou custos mudarem."
    ],
    "troubleshoot": "O valor depende dos dados inseridos e não garante aquisição naquele custo.",
    "example": "Frete, taxas e reembolsos podem reduzir a margem disponível."
  },
  {
    "href": "/ferramentas/nomes-campanha",
    "title": "Nomes de campanha",
    "category": "Ferramentas",
    "summary": "Padronize os nomes usados na sua operação.",
    "needs": "Produto, objetivo e contexto do teste.",
    "steps": [
      "Preencha os campos de identificação.",
      "Gere o nome.",
      "Copie para o gerenciador.",
      "Mantenha a mesma convenção ao criar UTMs."
    ],
    "troubleshoot": "Renomear um anúncio não reescreve parâmetros antigos já recebidos.",
    "example": "Inclua uma identificação que ajude a distinguir testes."
  },
  {
    "href": "/ferramentas/mapa-links",
    "title": "Mapa de links",
    "category": "Ferramentas",
    "summary": "Guarde os endereços importantes do funil.",
    "needs": "URLs completas da página, checkout e outras etapas.",
    "steps": [
      "Dê um nome a cada endereço.",
      "Adicione a URL HTTP ou HTTPS.",
      "Salve na sua conta.",
      "Clique no nome para conferir a página em outra aba."
    ],
    "troubleshoot": "Os links são organizados manualmente. Essa lista não muda redirecionamentos da página.",
    "example": "Cadastre página principal, checkout, obrigado e suporte."
  },
  {
    "href": "/ferramentas/checklist",
    "title": "Checklist de campanha",
    "category": "Ferramentas",
    "summary": "Registre sua revisão antes de iniciar tráfego.",
    "needs": "Projeto e integrações configurados.",
    "steps": [
      "Teste cada item na ferramenta correspondente.",
      "Marque apenas o que verificou.",
      "Salve a revisão na sua conta.",
      "Refaça a checagem após mudar página, Pixel ou gateway."
    ],
    "troubleshoot": "Marcar o checkbox registra sua revisão; não executa um teste automático.",
    "example": "Comece verificando tracker, UTMs, InitiateCheckout e pagamento confirmado."
  },
  {
    "href": "/ferramentas/ativador-tiktok",
    "title": "Pixel TikTok",
    "category": "Ferramentas",
    "summary": "Gere o script inicial do Pixel TikTok.",
    "needs": "ID do Pixel copiado do TikTok Events Manager.",
    "steps": [
      "Cole o ID completo, incluindo letras.",
      "Copie o snippet.",
      "Instale uma única vez na página.",
      "Confira o PageView nas ferramentas de teste do TikTok."
    ],
    "troubleshoot": "Esse snippet inicial envia PageView. Eventos de compra no TikTok precisam da integração correspondente; o webhook do GhostScale não a configura sozinho.",
    "example": "Não remova letras do ID do Pixel."
  },
  {
    "href": "/conta/perfil",
    "title": "Meu perfil",
    "category": "Conta",
    "summary": "Consulte a identidade e os projetos da conta atual.",
    "needs": "Sessão autenticada.",
    "steps": [
      "Confira os dados da conta exibidos.",
      "Verifique os projetos vinculados.",
      "Use o fluxo de recuperação na tela de login se perder a senha."
    ],
    "troubleshoot": "A tela atual mostra os dados que estão disponíveis; não altera e-mail por esta seção.",
    "example": "Cada conta deve visualizar apenas os próprios projetos."
  },
  {
    "href": "/conta/assinatura",
    "title": "Assinatura",
    "category": "Conta",
    "summary": "Confira o plano e a situação da cobrança.",
    "needs": "Conta autenticada.",
    "steps": [
      "Veja o plano e o status informados.",
      "Compare os recursos antes de trocar.",
      "Conclua o pagamento no checkout.",
      "Aguarde a confirmação para liberar os recursos."
    ],
    "troubleshoot": "Pix gerado não equivale a assinatura ativa. Um pagamento pendente ainda precisa ser aprovado.",
    "example": "Start → Pro → Black → Scale."
  },
  {
    "href": "/equipe",
    "title": "Equipe",
    "category": "Conta",
    "summary": "Confira a disponibilidade de acesso compartilhado.",
    "needs": "Conta autenticada.",
    "steps": [
      "Leia o estado atual da ferramenta.",
      "Use Meu perfil para conferir os projetos desta conta."
    ],
    "troubleshoot": "O fluxo de convites por e-mail ainda não está implementado nesta tela.",
    "example": "Não compartilhe a senha da sua conta para dar acesso a outra pessoa."
  },
  {
    "href": "/configuracoes",
    "title": "Configurações",
    "category": "Conta",
    "summary": "Ajuste preferências disponíveis no aplicativo.",
    "needs": "Conta autenticada.",
    "steps": [
      "Abra a preferência desejada.",
      "Use a prévia de som antes de escolher.",
      "Salve ou confirme a opção quando o controle solicitar."
    ],
    "troubleshoot": "O navegador pode pedir uma interação antes de permitir áudio ou notificações.",
    "example": "Use um som curto e reconhecível para vendas."
  },
  {
    "href": "/comunidade/rankings",
    "title": "Rankings",
    "category": "Comunidade",
    "summary": "Consulte os indicadores exibidos na classificação.",
    "needs": "Dados recebidos pela operação.",
    "steps": [
      "Confira o escopo e o período apresentados.",
      "Leia os critérios ao comparar posições."
    ],
    "troubleshoot": "Verifique o que a tabela mede antes de comparar operações.",
    "example": "Volume de vendas e receita representam métricas diferentes."
  },
  {
    "href": "/comunidade/chat",
    "title": "Chat e clubes",
    "category": "Comunidade",
    "summary": "Consulte o estado atual do espaço de conversa.",
    "needs": "Conta autenticada.",
    "steps": [
      "Leia a indicação de disponibilidade na tela.",
      "Use os canais de suporte informados para atendimento."
    ],
    "troubleshoot": "O chat atual é local ao navegador e não envia mensagens a outros usuários.",
    "example": "Não use um rascunho local como confirmação de atendimento."
  },
  {
    "href": "/feedback",
    "title": "Feedback",
    "category": "Conta",
    "summary": "Registre sugestões usando o fluxo disponível.",
    "needs": "Descrição clara do problema ou da melhoria.",
    "steps": [
      "Informe a tela e o que tentou fazer.",
      "Descreva o resultado esperado e o que aconteceu.",
      "Use a opção de envio apresentada."
    ],
    "troubleshoot": "Não inclua tokens, senhas ou dados de clientes no relato.",
    "example": "Exemplo: em Eventos, cliquei em Atualizar e a lista não carregou."
  },
  {
    "href": "/conta/assinatura-avancada",
    "title": "Assinatura avançada",
    "category": "Conta",
    "summary": "Consulte as opções adicionais apresentadas nesta área.",
    "needs": "Conta autenticada.",
    "steps": [
      "Confira o produto, o preço e o que será contratado.",
      "Leia as instruções da opção desejada antes de continuar."
    ],
    "troubleshoot": "Esta seção deve ser conferida separadamente da assinatura principal GhostScale.",
    "example": "Confirme qual serviço está sendo contratado no checkout."
  }
];
export const guideId = (href: string) => href === "/" ? "dashboard" : href.slice(1).replaceAll("/", "-");
