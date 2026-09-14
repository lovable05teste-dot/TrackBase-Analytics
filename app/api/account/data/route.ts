import { getAccountData } from "@/lib/account";
import { requestUserId } from "@/lib/trackbase-security";

export async function GET(request: Request) {
  const userId = await requestUserId(request);
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });
  return Response.json(await getAccountData(userId), {
    headers: { "cache-control": "no-store" },
  });
}
