import { PrivateSection } from "../../private-section";
import { BlacklistClient } from "./blacklist-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <PrivateSection title="Blacklist de IP" description="Bloqueie bots, concorrentes e cliques repetidos.">
      <BlacklistClient />
    </PrivateSection>
  );
}
