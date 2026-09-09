import { PrivateSection } from "../../private-section";
import { ChecklistClient } from "./checklist-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <PrivateSection title="Checklist Campanha" description="Suba campanha sem esquecer nada.">
      <ChecklistClient />
    </PrivateSection>
  );
}
