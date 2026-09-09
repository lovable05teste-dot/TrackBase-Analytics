import { AppShell } from "@/components/AppShell";
import { NamesClient } from "./names-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <AppShell title="Nomes de Campanha" subtitle="Padronize CBO, ABO e remarketing.">
      <NamesClient />
    </AppShell>
  );
}
