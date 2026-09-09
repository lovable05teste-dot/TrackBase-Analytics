import { PrivateSection } from "../../private-section";
import { UtmBuilderClient } from "./utm-builder-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <PrivateSection title="UTM Builder" description="Monte URLs rastreáveis para Meta, TikTok e Google.">
      <UtmBuilderClient />
    </PrivateSection>
  );
}
