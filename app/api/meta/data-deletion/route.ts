import { ensureDb, getDb } from "@/db";
import { auditLogs } from "@/db/schema";
import { deleteMetaUserData, signedRequestFrom } from "@/lib/meta-signed-request";

export const dynamic = "force-dynamic";

// "Callback de exclusão de dados" exigido pela Meta: o usuário remove o app
// no Facebook e pede a exclusão; apagamos contas e tokens e devolvemos o
// link de acompanhamento com o código de confirmação.
export async function POST(request: Request) {
  const data = await signedRequestFrom(request);
  if (!data?.user_id) return Response.json({ error: "signed_request inválido" }, { status: 400 });
  const removed = await deleteMetaUserData(String(data.user_id));
  const code = crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();
  await ensureDb();
  await getDb().insert(auditLogs).values({ id: crypto.randomUUID(), action: "meta.data_deletion", targetType: "meta_deletion", targetId: code, detail: JSON.stringify({ removed }), createdAt: Math.floor(Date.now() / 1000) });
  return Response.json({ url: `https://www.ghostscale.com.br/exclusao-de-dados?codigo=${code}`, confirmation_code: code });
}
