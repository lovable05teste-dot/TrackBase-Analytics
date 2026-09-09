import { PrivateSection } from "../private-section";
import { AgentHubClient } from "./agent-hub-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <PrivateSection title="Agent Hub" description="Automações que vigiam CPA, ROAS, checkout e tráfego inválido.">
      <AgentHubClient />
    </PrivateSection>
  );
}
