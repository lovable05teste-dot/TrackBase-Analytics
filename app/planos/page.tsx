import { redirect } from "next/navigation";
import { getChatGPTUser } from "../chatgpt-auth";
import { AssinaturaClient } from "../conta/assinatura/assinatura-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getChatGPTUser();
  if (!user) redirect("/login?return_to=/planos");
  return <AssinaturaClient />;
}
