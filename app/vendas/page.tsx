import { SalesClient } from "./sales-client";
import { PrivateSection } from "../private-section";
export const dynamic="force-dynamic";export default function Page(){return <PrivateSection title="Vendas" description="Pendentes, aprovadas, reembolsadas, canceladas e chargebacks enviados pelos gateways."><SalesClient /></PrivateSection>}
