import { AppShell } from "@/components/AppShell";
import { UtmBuilderClient } from "./utm-builder-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <AppShell title="UTM Builder" subtitle="Monte URLs rastreáveis para Meta, TikTok e Google.">
      <UtmBuilderClient />
    </AppShell>
  );
}
