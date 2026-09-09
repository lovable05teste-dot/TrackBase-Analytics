import { PrivateSection } from "../private-section";
import { SoundNotifications } from "@/components/SoundNotifications";
export const dynamic="force-dynamic";export default function Page(){return <PrivateSection title="Vendas" description="Pendentes, aprovadas, reembolsadas, canceladas e chargebacks enviados pelos gateways."><SoundNotifications/></PrivateSection>}
