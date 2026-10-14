# Pixels, dashboards e webhooks

- **Pixels e conversões** no menu: selecione um projeto. O pixel principal permanece; em **Adicionar pixel**, informe nome, ID do pixel e token CAPI. Remova apenas o destino desejado. Tokens adicionais ficam criptografados e não são devolvidos pelas APIs.
- O tracker instala todos os pixels do projeto e usa `trackSingle`. Uma mesma venda tem um único pedido/evento interno, com recibos CAPI independentes por pixel. O mesmo `event_id` é preservado. Falha em um destino não impede os demais e permanece na fila de tentativas. Valide o acesso de cada token no Gerenciador de Eventos; salvar configuração não comprova entrega.
- **Meus dashboards**, na visão geral: escolha período, origem, produto e métricas; clique em **Salvar novo dashboard**. Os filtros ficam na conta e podem ser abertos em outro dispositivo. Não cria dados nem copia vendas. Datas fixas são preservadas quando o período é personalizado.
- **Webhooks** no menu: escolha gateway, projeto e nome opcional para gerar uma URL de entrada. Copie a credencial quando ela aparece e cadastre-a no gateway. A tela lista conexões existentes e permite removê-las. O teste de envio existente continua disponível e envia payload real; use um projeto de testes.
- Não foram adicionados webhooks de saída para URLs arbitrárias. Esta entrega gerencia os webhooks de entrada de pagamentos já utilizados pelo produto.
- As tabelas adicionais `project_pixels` e `saved_dashboards` são criadas pelo mecanismo idempotente `ensureDb`, como as demais tabelas. Exclusão de projeto/conta remove as configurações correspondentes.

Validação local: build Next.js, TypeScript, testes de vários pixels/recibos, deduplicação, dashboards e isolamento de usuários. A entrega real em contas Meta e gateways requer as credenciais do titular e teste de produção. A revisão visual por Chromium não foi concluída porque o download do navegador falhou.
