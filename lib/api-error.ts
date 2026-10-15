// Erro interno de rota: o detalhe (mensagem, stack, resposta do provedor) vai
// para o log do servidor; o cliente recebe só a mensagem genérica.
export function internalError(error: unknown, message: string) {
  console.error(message, error);
  return Response.json({ error: message }, { status: 500 });
}
