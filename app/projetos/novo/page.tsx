import { PrivateSection } from "../../private-section";
import { NewProjectForm } from "./new-project-form";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <PrivateSection title="Novo Projeto" description="Crie um projeto para gerar a chave pública e o script de rastreamento.">
      <NewProjectForm />
    </PrivateSection>
  );
}
