import { PrivateSection } from "../private-section";
import { WebhooksClient } from "./webhooks-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <PrivateSection title="Webhooks" description="Teste o webhook universal de vendas e copie o formato.">
      <WebhooksClient />
    </PrivateSection>
  );
}
