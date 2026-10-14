import { ClientesClient } from "./clientes-client";
import { PrivateSection } from "../private-section";
export const dynamic = "force-dynamic";
export default function Page() {
  return (
    <PrivateSection title="Clientes" description="Quem comprou, quanto gastou e quando foi a última compra.">
      <ClientesClient />
    </PrivateSection>
  );
}
