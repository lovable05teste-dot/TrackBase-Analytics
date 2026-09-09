import { PrivateSection } from "../private-section";
import {CampaignsClient} from "./campaigns-client";
export const dynamic="force-dynamic";export default function Page(){return <PrivateSection title="Campanhas" description="Gasto da Meta cruzado com acessos, checkouts e vendas rastreadas."><CampaignsClient/></PrivateSection>}
