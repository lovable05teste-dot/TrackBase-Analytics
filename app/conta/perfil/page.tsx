import { PrivateSection } from "../../private-section";
import { getProjectIds, getWorkspace } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { userId, workspaceId } = await getWorkspace();
  const { rows } = await getProjectIds(workspaceId);
  return (
    <PrivateSection title="Meu Perfil" description="Identidade do workspace e acesso.">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="metric-card rounded-xl p-5"><b>Conta</b><div className="mt-3 space-y-2 text-sm"><p><span className="text-slate-500">Usuário:</span> {userId ?? "não identificado"}</p><p><span className="text-slate-500">Workspace:</span> <code className="text-violet-300">{workspaceId ?? "—"}</code></p><p><span className="text-slate-500">Projetos:</span> {rows.length}</p><p><span className="text-slate-500">Papel:</span> Administrador</p></div></div>
        <div className="metric-card rounded-xl p-5"><b>Projetos vinculados</b><div className="mt-3 space-y-2">{rows.length ? rows.map((p) => <div key={p.id} className="flex justify-between rounded-lg bg-white/[.03] p-3 text-sm"><span>{p.name}</span><code className="text-xs text-slate-500">{p.publicKey?.slice(0, 8)}…</code></div>) : <p className="text-sm text-slate-500">Nenhum projeto. <a href="/projetos/novo" className="text-violet-300 underline">Criar</a></p>}</div></div>
      </div>
    </PrivateSection>
  );
}
