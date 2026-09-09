import { AppShell } from "@/components/AppShell";
import { ChecklistClient } from "./checklist-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <AppShell title="Checklist Campanha" subtitle="Suba campanha sem esquecer nada.">
      <ChecklistClient />
    </AppShell>
  );
}
