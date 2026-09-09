import { AppShell } from "@/components/AppShell";
import { WebhooksClient } from "./webhooks-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <AppShell title="Webhooks" subtitle="Teste o webhook universal de vendas e copie o formato.">
      <WebhooksClient />
    </AppShell>
  );
}
