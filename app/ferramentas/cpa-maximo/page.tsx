import { PrivateSection } from "../../private-section";
import { CpaMaxClient } from "./cpa-max-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <PrivateSection title="CPA Máximo" description="Saiba quanto pode pagar por venda sem prejuízo.">
      <CpaMaxClient />
    </PrivateSection>
  );
}
