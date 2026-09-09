import { AppShell } from "@/components/AppShell";
import { AgentHubClient } from "./agent-hub-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <AppShell title="Agent Hub" subtitle="Automações que vigiam CPA, ROAS, checkout e tráfego inválido.">
      <AgentHubClient />
    </AppShell>
  );
}
