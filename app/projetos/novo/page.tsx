import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getPlanContext, getUserIdFromSessionCookie } from "@/lib/trackbase-security";
import { AppShell } from "@/components/AppShell";
import { UpgradeCta } from "@/components/UpgradeCta";
import { NewProjectForm } from "./new-project-form";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getChatGPTUser();
  if (!user) redirect("/login?return_to=/projetos/novo");
  const session = (await cookies()).get("tb_session")?.value;
  const userId = await getUserIdFromSessionCookie(session);
  // Criar projeto exige plano: mostra o CTA em vez de expulsar.
  const { hasActive } = await getPlanContext(userId);
  if (!hasActive)
    return (
      <AppShell title="Novo Projeto" subtitle="Crie um projeto para gerar a chave pública e o script de rastreamento.">
        <UpgradeCta what="Criar projeto" minPlan="Start" />
      </AppShell>
    );
  return (
    <AppShell title="Novo Projeto" subtitle="Crie um projeto para gerar a chave pública e o script de rastreamento.">
      <NewProjectForm />
    </AppShell>
  );
}
