import { PrivateSection } from "../private-section";
import { TiktokAdsClient } from "./tiktok-client";
export const dynamic = "force-dynamic";
export default function Page() {
  return <PrivateSection title="TikTok Ads" description="Gasto do TikTok cruzado com visitas, checkouts e vendas rastreadas."><TiktokAdsClient /></PrivateSection>;
}
