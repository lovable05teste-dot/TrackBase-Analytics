import { PrivateSection } from "../../private-section";
import { ChatClient } from "./chat-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <PrivateSection title="Chat e Clubes" description="Troque ideia com outros gestores e suba de clube.">
      <ChatClient />
    </PrivateSection>
  );
}
