import { AppShell } from "@/components/AppShell";
import { BlacklistClient } from "./blacklist-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <AppShell title="Blacklist de IP" subtitle="Exclua endereços específicos dos novos eventos de rastreamento.">
      <BlacklistClient />
    </AppShell>
  );
}
