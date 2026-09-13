// Cancelamento pelo app desativado por decisão de produto (não existe fluxo
// de cancelamento no painel — o botão foi removido da tela de assinatura).
// Endpoint mantido retornando 410 para não reativar por engano via chamada
// direta. Para religar, reverta este arquivo no git.
export async function POST() {
  return Response.json({ error: "Cancelamento indisponível por aqui. Fale com o suporte." }, { status: 410 });
}
