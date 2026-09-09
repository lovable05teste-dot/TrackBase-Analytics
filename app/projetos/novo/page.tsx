import { AppShell } from "@/components/AppShell";
import { NewProjectForm } from "./new-project-form";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <AppShell title="Novo Projeto" subtitle="Crie um projeto para gerar a chave pública e o script de rastreamento.">
      <NewProjectForm />
    </AppShell>
  );
}
