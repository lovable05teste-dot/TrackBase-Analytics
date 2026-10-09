import { and, desc, eq, inArray } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { auditLogs } from "@/db/schema";
import { requestUserId, sha256 } from "@/lib/trackbase-security";

export const dynamic = "force-dynamic";

// Últimas vendas recebidas pelos webhooks e o resultado do push de cada uma
// (diagnóstico mostrado no sino).
export async function GET(request: Request) {
  const userId = await requestUserId(request);
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });
  await ensureDb();
  const workspaceId = "ws_" + (await sha256(userId)).slice(0, 24);
  const rows = await getDb()
    .select({ action: auditLogs.action, order: auditLogs.targetId, detail: auditLogs.detail, at: auditLogs.createdAt })
    .from(auditLogs)
    .where(and(eq(auditLogs.workspaceId, workspaceId), inArray(auditLogs.action, ["sale.received", "push.sale"])))
    .orderBy(desc(auditLogs.createdAt))
    .limit(20);
  return Response.json({ entries: rows.map((r) => ({ ...r, detail: (() => { try { return JSON.parse(r.detail || "{}"); } catch { return {}; } })() })) }, { headers: { "cache-control": "no-store" } });
}
