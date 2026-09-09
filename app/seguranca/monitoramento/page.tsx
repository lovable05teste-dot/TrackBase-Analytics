import { AppShell } from "@/components/AppShell";
import { MonitorClient } from "./monitor-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <AppShell title="Monitoramento de Sites" subtitle="Verifique se a página de vendas e o checkout estão no ar.">
      <MonitorClient />
    </AppShell>
  );
}
