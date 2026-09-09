import { AppShell } from "@/components/AppShell";
import { ChatClient } from "./chat-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <AppShell title="Chat e Clubes" subtitle="Troque ideia com outros gestores e suba de clube.">
      <ChatClient />
    </AppShell>
  );
}
