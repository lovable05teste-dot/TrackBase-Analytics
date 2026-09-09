import { and, eq, gte, inArray } from "drizzle-orm";
import { ensureDb, getDb } from "../../../../db";
import { events, projects } from "../../../../db/schema";
import { requestUserId, sha256 } from "../../../../lib/trackbase-security";

export async function GET(request: Request) {
  try {
    await ensureDb();
    const userId = await requestUserId(request);
    if (!userId) return Response.json({ error: "Não autenticado." }, { status: 401 });
    const params = new URL(request.url).searchParams;
    const since = Number(params.get("since") || "0");
    const workspaceId = "ws_" + (await sha256(userId)).slice(0, 24);
    const projectRows = await getDb().select({ id: projects.id }).from(projects).where(eq(projects.workspaceId, workspaceId));
    const ids = projectRows.map((p) => p.id);
    if (!ids.length) return Response.json({ purchases: [], now: Math.floor(Date.now() / 1000) });
    const conditions = [inArray(events.projectId, ids), eq(events.eventName, "Purchase")];
    if (since > 0) conditions.push(gte(events.occurredAt, since));
    const rows = await getDb().select({
      id: events.id,
      eventId: events.eventId,
      value: events.value,
      currency: events.currency,
      occurredAt: events.occurredAt,
      utmCampaign: events.utmCampaign,
    }).from(events).where(and(...conditions));
    return Response.json({ purchases: rows, now: Math.floor(Date.now() / 1000) });
  } catch {
    return Response.json({ purchases: [], now: Math.floor(Date.now() / 1000) });
  }
}