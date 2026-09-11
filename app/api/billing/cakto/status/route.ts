import { desc, eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { planSubscriptions } from "@/db/schema";
import { requestUserId, sha256 } from "@/lib/trackbase-security";
import { plansCatalog } from "@/lib/cakto-plans";

export async function GET(request: Request) {
  await ensureDb();
  const userId = await requestUserId(request);
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const workspaceId = "ws_" + (await sha256(userId)).slice(0, 24);
  const rows = await getDb()
    .select()
    .from(planSubscriptions)
    .where(eq(planSubscriptions.workspaceId, workspaceId))
    .orderBy(desc(planSubscriptions.createdAt))
    .limit(10);
  const current = rows[0]
    ? {
        plan: rows[0].plan,
        status: rows[0].status,
        amount: rows[0].amount,
        currency: rows[0].currency,
        currentPeriodEnd: rows[0].currentPeriodEnd,
        updatedAt: rows[0].updatedAt,
      }
    : null;
  return Response.json({
    subscription: current,
    plans: plansCatalog(),
    sdkClientId: (process.env.NEXT_PUBLIC_CAKTO_CLIENT_ID || "").trim() ? true : false,
  });
}
