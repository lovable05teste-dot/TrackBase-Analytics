import { eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { users } from "@/db/schema";
import { deleteUserAccount } from "@/lib/account-delete";
import { clearSessionCookie, hasConflictingOrigin, requestUserId, sha256, verifyPassword } from "@/lib/trackbase-security";

export const dynamic = "force-dynamic";

// Exclusão definitiva da conta. Pede a senha atual (e não aceita sessão
// de outra origem). Não cancela assinatura: isso é feito com o suporte.
export async function POST(request: Request) {
  if (hasConflictingOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const userId = await requestUserId(request);
  if (!userId) return Response.json({ error: "Não autenticado." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { password?: string; confirm?: string };
  if (body.confirm !== "EXCLUIR") return Response.json({ error: "Digite EXCLUIR para confirmar." }, { status: 400 });
  await ensureDb();
  const db = getDb();
  const [user] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return Response.json({ error: "Conta não encontrada." }, { status: 404 });
  const ok = await verifyPassword(String(body.password || ""), user.passwordHash);
  if (ok === "invalid") return Response.json({ error: "Senha incorreta." }, { status: 403 });
  const workspaceId = "ws_" + (await sha256(userId)).slice(0, 24);
  await deleteUserAccount(db, userId, workspaceId);
  return Response.json({ deleted: true }, { headers: { "set-cookie": clearSessionCookie(), "cache-control": "no-store" } });
}
