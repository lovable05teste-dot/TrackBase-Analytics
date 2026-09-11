import { AppShell } from "@/components/AppShell";
import { ensureDb, getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getProjectIds, getWorkspace } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { userId, workspaceId } = await getWorkspace();
  const { rows } = await getProjectIds(workspaceId);
  let name = null;
  let email = null;
  if (userId) {
    try {
      await ensureDb();
      const [row] = await getDb().select({ name: users.name, email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
      name = row && row.name ? row.name : null;
      email = row && row.email ? row.email : null;
    } catch {
      /* mantem nulo */
    }
  }
  return (
    <AppShell title="Meu Perfil" subtitle="Identidade do workspace e acesso.">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="metric-card rounded-xl p-5"><b>Conta</b><div className="mt-3 space-y-2 text-sm"><p><span className="text-slate-500">Nome:</span> {name ? name : "—"}</p><p><span className="text-slate-500">E-mail:</span> {email ? email : "—"}</p><p><span className="text-slate-500">Projetos:</span> {rows.length}</p></div></div>
        <div className="metric-card rounded-xl p-5"><b>Projetos vinculados</b><div className="mt-3 space-y-2">{rows.length ? rows.map((p) => <div key={p.id} className="flex justify-between rounded-lg bg-white/[.03] p-3 text-sm"><span>{p.name}</span><code className="text-xs text-slate-500">{p.publicKey ? p.publicKey.slice(0, 8) : ""}…</code></div>) : <p className="text-sm text-slate-500">Nenhum projeto. <a href="/projetos/novo" className="text-violet-300 underline">Criar</a></p>}</div></div>
      </div>
    </AppShell>
  );
}
