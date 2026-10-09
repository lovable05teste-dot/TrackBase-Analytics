import { AppShell } from "@/components/AppShell";
import { MonitorClient } from "./monitor-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <AppShell title="Monitoramento de Sites" subtitle="A GhostScale verifica sua página e o checkout a cada 5 minutos e avisa no celular se cair.">
      <MonitorClient />
    </AppShell>
  );
}
