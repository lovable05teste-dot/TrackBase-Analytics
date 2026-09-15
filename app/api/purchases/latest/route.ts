import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { ensureDb, getDb } from "../../../../db";
import { orders, projects } from "../../../../db/schema";
import { requestUserId, sha256 } from "../../../../lib/trackbase-security";

export async function GET(request: Request) {
  try {
    await ensureDb();
    const userId = await requestUserId(request);
    if (!userId) return Response.json({ error: "Não autenticado." }, { status: 401 });
    const params = new URL(request.url).searchParams;
    const since = Number(params.get("since") || "0");
    const workspaceId = "ws_" + (await sha256(userId)).slice(0, 24);
    const projectRows = await getDb().select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.workspaceId, workspaceId));
    const ids = projectRows.map((p) => p.id);
    if (!ids.length) return Response.json({ purchases: [], now: Math.floor(Date.now() / 1000) });
    const names = new Map(projectRows.map((p) => [p.id, p.name]));
    const conditions = [inArray(orders.projectId, ids), inArray(orders.status, ["pending", "approved"])];
    if (since > 0) conditions.push(gte(orders.updatedAt, since));
    const rows = await getDb().select({
      id: orders.id,
      eventId: orders.eventId,
      status: orders.status,
      value: orders.value,
      currency: orders.currency,
      occurredAt: orders.updatedAt,
      utmCampaign: orders.utmCampaign,
      utmContent: orders.utmContent,
      projectId: orders.projectId,
    }).from(orders).where(and(...conditions)).orderBy(desc(orders.updatedAt)).limit(100);
    return Response.json({ purchases: rows.map((r) => ({ ...r, projectName: names.get(r.projectId) || "" })), now: Math.floor(Date.now() / 1000) });
  } catch {
    return Response.json({ purchases: [], now: Math.floor(Date.now() / 1000) });
  }
}
