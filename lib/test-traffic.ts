import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { events } from "@/db/schema";
import type { getDb } from "@/db";

// Navegadores em modo teste (?gs_test=1 na página): tudo que vier deles
// (visitas, ICs, Pix e vendas com o mesmo tb_vid) fica fora das métricas.
export async function testVisitorIds(db: ReturnType<typeof getDb>, projectIds: string[]) {
  if (!projectIds.length) return new Set<string>();
  const rows = await db.selectDistinct({ visitorId: events.visitorId }).from(events).where(and(inArray(events.projectId, projectIds), eq(events.source, "test"), isNotNull(events.visitorId)));
  return new Set(rows.map((r) => String(r.visitorId)).filter(Boolean));
}

export function isTestEvent(e: { source?: string | null; visitorId?: string | null }, testVisitors: Set<string>) {
  return e.source === "test" || (!!e.visitorId && testVisitors.has(String(e.visitorId)));
}
