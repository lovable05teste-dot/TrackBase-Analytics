import { AppShell } from "@/components/AppShell";
import { TiktokClient } from "./tiktok-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <AppShell title="Ativador Pixel TikTok" subtitle="Instale o pixel TT em 1 minuto junto à GhostScale.">
      <TiktokClient />
    </AppShell>
  );
}
