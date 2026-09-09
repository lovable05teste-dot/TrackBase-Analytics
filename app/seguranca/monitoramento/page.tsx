import { PrivateSection } from "../../private-section";
import { MonitorClient } from "./monitor-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <PrivateSection title="Monitoramento de Sites" description="Verifique se a página de vendas e o checkout estão no ar.">
      <MonitorClient />
    </PrivateSection>
  );
}
