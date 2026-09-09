import { PrivateSection } from "../private-section";
import { FeedbackClient } from "./feedback-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <PrivateSection title="Feedback" description="Sugestões, bugs e elogios — lidos de verdade.">
      <FeedbackClient />
    </PrivateSection>
  );
}
