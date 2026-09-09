import { AppShell } from "@/components/AppShell";
import { BlacklistClient } from "./blacklist-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <AppShell title="Blacklist de IP" subtitle="Bloqueie bots, concorrentes e cliques repetidos.">
      <BlacklistClient />
    </AppShell>
  );
}
