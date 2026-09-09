import { AppShell } from "@/components/AppShell";
import { FeedbackClient } from "./feedback-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <AppShell title="Feedback" subtitle="Sugestões, bugs e elogios — lidos de verdade.">
      <FeedbackClient />
    </AppShell>
  );
}
