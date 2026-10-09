import { and, eq, inArray, isNotNull, ne } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { apiCredentials, events, metaAccounts, metaLinked, orders, projects } from "@/db/schema";
import { getWorkspace } from "@/lib/analytics";
import { PrivateSection } from "../private-section";
import IntegrationSetup, { type SetupStatus } from "./setup";

export const dynamic = "force-dynamic";

// Status real de cada etapa, calculado no servidor para o passo a passo já
// abrir na próxima pendência. Falha no banco nunca derruba a página: cai no
// estado "pendente" e os componentes de cada etapa carregam por conta própria.
async function loadStatus(): Promise<SetupStatus> {
  const empty: SetupStatus = { projects: 0, receivingVisits: false, metaLogins: 0, metaLinked: 0, pixelConnected: false, gateways: 0, sales: 0, utmVisits: false };
  try {
    const { userId, workspaceId } = await getWorkspace();
    if (!userId || !workspaceId) return empty;
    await ensureDb();
    const db = getDb();
    const projectRows = await db.select({ id: projects.id, pixelId: projects.pixelId, token: projects.metaTokenCipher }).from(projects).where(eq(projects.workspaceId, workspaceId));
    const ids = projectRows.map((p) => p.id);
    const [accounts, linked, credentials, visit, utmVisit, sale] = await Promise.all([
      db.select({ id: metaAccounts.id }).from(metaAccounts).where(eq(metaAccounts.userId, userId)),
      db.select({ id: metaLinked.adAccountId }).from(metaLinked).where(eq(metaLinked.userId, userId)),
      db.select({ active: apiCredentials.active }).from(apiCredentials).where(eq(apiCredentials.workspaceId, workspaceId)),
      ids.length ? db.select({ id: events.id }).from(events).where(and(inArray(events.projectId, ids), eq(events.source, "browser"))).limit(1) : Promise.resolve([]),
      ids.length ? db.select({ id: events.id }).from(events).where(and(inArray(events.projectId, ids), eq(events.source, "browser"), isNotNull(events.utmCampaign), ne(events.utmCampaign, ""))).limit(1) : Promise.resolve([]),
      ids.length ? db.select({ id: orders.id }).from(orders).where(inArray(orders.projectId, ids)).limit(1) : Promise.resolve([]),
    ]);
    return {
      projects: projectRows.length,
      receivingVisits: visit.length > 0,
      metaLogins: accounts.length,
      metaLinked: linked.length,
      pixelConnected: projectRows.some((p) => p.pixelId && p.token),
      // `active` pode ser integer ou boolean conforme o banco: filtra em JS.
      gateways: credentials.filter((c) => Boolean(c.active)).length,
      sales: sale.length,
      utmVisits: utmVisit.length > 0,
    };
  } catch (error) {
    console.error("integrations status", error);
    return empty;
  }
}

export default async function Integracoes() {
  const status = await loadStatus();
  return (
    <PrivateSection title="Integrações" description="Configure o rastreamento em 5 passos">
      <IntegrationSetup status={status} />
    </PrivateSection>
  );
}
