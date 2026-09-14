import { AppShell } from "@/components/AppShell";
import { ProtectionClient } from "./protection-client";
export const dynamic = "force-dynamic";
export default function Page() {
  return <AppShell title="Anti-Clone" subtitle="Proteções e regras para sua página de vendas."><ProtectionClient /></AppShell>;
}
