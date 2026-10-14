import { GatewayConnect } from "../integracoes/connections";
import { AppShell } from "@/components/AppShell";
import { WebhooksClient } from "./webhooks-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <AppShell title="Webhooks" subtitle="Crie URLs por projeto, gerencie conexões e teste o recebimento.">
      <section className="mb-6 rounded-2xl border border-border bg-card p-5"><h2 className="mb-4 text-lg font-semibold">Criar webhook de vendas</h2><GatewayConnect/></section>
      <WebhooksClient />
    </AppShell>
  );
}
