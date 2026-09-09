import { PrivateSection } from "../../private-section";
import { RoasClient } from "./roas-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <PrivateSection title="Calculadora ROAS/CPA" description="Descubra ROAS, CPA, ticket e lucro em segundos.">
      <RoasClient />
    </PrivateSection>
  );
}
