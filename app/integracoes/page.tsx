import { requireChatGPTUser } from "../chatgpt-auth";
import IntegrationSetup from "./setup";
import { SoundNotifications } from "@/components/SoundNotifications";

export const dynamic = "force-dynamic";
export default async function Integracoes() {
  await requireChatGPTUser("/integracoes");
  return (<><IntegrationSetup /><SoundNotifications /></>);
}
