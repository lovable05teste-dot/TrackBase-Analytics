import { PrivateSection } from "../../private-section";
import { TiktokClient } from "./tiktok-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <PrivateSection title="Ativador Pixel TikTok" description="Instale o pixel TT em 1 minuto junto à TrackBase.">
      <TiktokClient />
    </PrivateSection>
  );
}
