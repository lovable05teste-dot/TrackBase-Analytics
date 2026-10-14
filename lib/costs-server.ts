// Custos salvos da operação, lidos no servidor (para rotas que calculam lucro).
import { and, eq } from "drizzle-orm";
import type { getDb } from "@/db";
import { toolStates } from "@/db/schema";
import { normalizeCosts, normalizeGatewayRates, ZERO_COSTS, hasCosts, type Costs, type GatewayRates } from "@/lib/costs";

export async function loadWorkspaceCosts(db: ReturnType<typeof getDb>, workspaceId: string): Promise<{ costs: Costs; rates: GatewayRates }> {
  const [row] = await db
    .select({ data: toolStates.data })
    .from(toolStates)
    .where(and(eq(toolStates.workspaceId, workspaceId), eq(toolStates.tool, "custos")))
    .limit(1);
  if (!row) return { costs: ZERO_COSTS, rates: {} };
  let parsed: unknown = {};
  try {
    parsed = JSON.parse(row.data);
  } catch {
    parsed = {};
  }
  const costs = normalizeCosts(parsed);
  const rates = normalizeGatewayRates((parsed as { gateways?: unknown })?.gateways);
  return { costs: hasCosts(costs) || Object.keys(rates).length ? costs : ZERO_COSTS, rates };
}
