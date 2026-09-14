import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { getProjectIds, getWorkspace } from "@/lib/analytics";
import { getAccountData } from "@/lib/account";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { userId, workspaceId } = await getWorkspace();
  if (!userId) redirect("/login");
  const [account, projects] = await Promise.all([
    getAccountData(userId),
    getProjectIds(workspaceId),
  ]);
  const { rows } = projects;
  return (
    <AppShell title="Meu Perfil" subtitle="Sua conta, segurança e projetos.">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="metric-card rounded-xl p-5"><b>Minha conta</b><div className="mt-3 space-y-2 text-sm"><p><span className="text-slate-500">Nome:</span> {account.userName}</p><p><span className="text-slate-500">E-mail:</span> {account.userEmail || "—"}</p><p><span className="text-slate-500">Plano:</span> {account.planName}</p><p><span className="text-slate-500">Projetos:</span> {rows.length}</p>{account.isAdmin ? <><p><span className="text-slate-500">Workspace:</span> <code className="text-violet-300">{account.workspaceName}</code></p><p><span className="text-slate-500">Papel:</span> Administrador</p></> : null}</div></div>
        <div className="metric-card rounded-xl p-5"><b>Projetos vinculados</b><div className="mt-3 space-y-2">{rows.length ? rows.map((p) => <div key={p.id} className="flex justify-between rounded-lg bg-white/[.03] p-3 text-sm"><span>{p.name}</span><code className="text-xs text-slate-500">{p.publicKey?.slice(0, 8)}…</code></div>) : <p className="text-sm text-slate-500">Nenhum projeto. <a href="/projetos/novo" className="text-violet-300 underline">Criar</a></p>}</div></div>
      </div>
    </AppShell>
  );
}
