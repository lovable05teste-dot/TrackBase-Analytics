import { AppShell } from "@/components/AppShell";
import { CpaMaxClient } from "./cpa-max-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <AppShell title="CPA Máximo" subtitle="Saiba quanto pode pagar por venda sem prejuízo.">
      <CpaMaxClient />
    </AppShell>
  );
}
