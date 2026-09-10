import { AppShell } from "@/components/AppShell";
import { brl, getProjectIds, getWorkspace } from "@/lib/analytics";
import { ensureDb, getDb } from "@/db";
import { and, desc, eq, inArray } from "drizzle-orm";
import { apiCredentials, orders } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { workspaceId } = await getWorkspace();
  const { rows, ids } = await getProjectIds(workspaceId);
  await ensureDb();
  const db = getDb();
  const creds = workspaceId ? await db.select({ id: apiCredentials.id, name: apiCredentials.name, provider: apiCredentials.provider, projectId: apiCredentials.projectId, active: apiCredentials.active }).from(apiCredentials).where(eq(apiCredentials.workspaceId, workspaceId)) : [];
  const lastOrders = ids.length ? await db.select({ provider: orders.provider, status: orders.status, value: orders.value, externalId: orders.externalId, updatedAt: orders.updatedAt }).from(orders).where(inArray(orders.projectId, ids)).orderBy(desc(orders.updatedAt)).limit(20) : [];
  void and;
  return (
    <AppShell title="Gateways" subtitle="Credenciais de webhook e últimos pedidos por gateway.">
      <div className="grid gap-4">
        <div className="metric-card rounded-xl p-5">
          <div className="flex items-center justify-between"><b>Credenciais ativas ({creds.length})</b><a href="/integracoes" className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5">+ Nova credencial</a></div>
          <div className="mt-4 grid gap-2">
            {creds.length ? creds.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/[.03] p-3 text-sm"><span><b>{c.name}</b> <span className="text-slate-500">· {c.provider} · {rows.find((p) => p.id === c.projectId)?.name ?? c.projectId}</span></span><span className={c.active ? "text-emerald-300" : "text-slate-500"}>{c.active ? "● ativa" : "pausada"}</span></div>
            )) : <p className="text-sm text-slate-500">Nenhuma credencial. Crie em Integrações → Gateways.</p>}
          </div>
        </div>
        <div className="metric-card overflow-x-auto rounded-xl">
          <div className="border-b border-white/10 p-5"><b>Últimos pedidos</b></div>
          <table className="w-full min-w-[560px] text-sm"><thead><tr>{["Gateway", "ID externo", "Status", "Valor"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{lastOrders.length ? lastOrders.map((o, i) => <tr key={`${o.externalId}-${i}`}><td>{o.provider}</td><td className="max-w-[220px] truncate font-mono text-xs">{o.externalId}</td><td>{o.status}</td><td>{brl(Number(o.value))}</td></tr>) : <tr><td colSpan={4} className="py-8 text-center text-slate-500">Sem pedidos ainda.</td></tr>}</tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
