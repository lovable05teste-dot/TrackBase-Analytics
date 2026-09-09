import { AppShell } from "@/components/AppShell";
import { RoasClient } from "./roas-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <AppShell title="Calculadora ROAS/CPA" subtitle="Descubra ROAS, CPA, ticket e lucro em segundos.">
      <RoasClient />
    </AppShell>
  );
}
