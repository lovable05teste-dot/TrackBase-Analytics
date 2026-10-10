import { deleteMetaUserData, signedRequestFrom } from "@/lib/meta-signed-request";

export const dynamic = "force-dynamic";

// "Callback de desautorização": quem remove o app no Facebook tem os tokens
// e contas apagados da GhostScale na hora.
export async function POST(request: Request) {
  const data = await signedRequestFrom(request);
  if (!data?.user_id) return Response.json({ error: "signed_request inválido" }, { status: 400 });
  await deleteMetaUserData(String(data.user_id));
  return Response.json({ ok: true });
}
