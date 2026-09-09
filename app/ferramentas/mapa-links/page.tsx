import { AppShell } from "@/components/AppShell";
import { LinkMapClient } from "./linkmap-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <AppShell title="Mapa de Links" subtitle="Todos os links da operação num só lugar.">
      <LinkMapClient />
    </AppShell>
  );
}
