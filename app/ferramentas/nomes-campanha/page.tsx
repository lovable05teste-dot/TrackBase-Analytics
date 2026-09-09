import { PrivateSection } from "../../private-section";
import { NamesClient } from "./names-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <PrivateSection title="Nomes de Campanha" description="Padronize CBO, ABO e remarketing.">
      <NamesClient />
    </PrivateSection>
  );
}
