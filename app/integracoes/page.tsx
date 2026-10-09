import { loadSetupStatus } from "@/lib/setup-status";
import { PrivateSection } from "../private-section";
import IntegrationSetup from "./setup";
import { CapiDeliveryStatus } from "./capi-delivery-status";

export const dynamic = "force-dynamic";

export default async function Integracoes() {
  const status = await loadSetupStatus();
  return (
    <PrivateSection title="Integrações" description="Configure o rastreamento em 5 passos">
      <IntegrationSetup status={status} />
      <CapiDeliveryStatus />
    </PrivateSection>
  );
}
