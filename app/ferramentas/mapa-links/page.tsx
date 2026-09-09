import { PrivateSection } from "../../private-section";
import { LinkMapClient } from "./linkmap-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <PrivateSection title="Mapa de Links" description="Todos os links da operação num só lugar.">
      <LinkMapClient />
    </PrivateSection>
  );
}
