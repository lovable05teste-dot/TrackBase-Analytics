import { SalesClient } from "./sales-client";
import { PrivateSection } from "../private-section";
export const dynamic="force-dynamic";export default function Page(){return <PrivateSection title="Vendas" description="Pendentes, aprovadas, reembolsadas, canceladas e chargebacks enviados pelos gateways."><div className="relative"><div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent"/><SalesClient /></div></PrivateSection>}
