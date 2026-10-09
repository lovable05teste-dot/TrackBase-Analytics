import { hasConflictingOrigin, requestUserId, sha256 } from "@/lib/trackbase-security";
import { pushToWorkspace } from "@/lib/push";

export const dynamic = "force-dynamic";

// Envia uma "venda aprovada" de teste para os celulares inscritos do próprio
// usuário, para conferir se a notificação e o som chegam.
export async function POST(request: Request) {
  if (hasConflictingOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const userId = await requestUserId(request);
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const workspaceId = "ws_" + (await sha256(userId)).slice(0, 24);
  await pushToWorkspace(workspaceId, { title: "Venda aprovada · R$ 97,00", body: "Notificação de teste da GhostScale", url: "/vendas", tag: `tb-test-${Date.now()}` });
  return Response.json({ ok: true });
}
