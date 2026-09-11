import { PrivateSection } from "../private-section";
import { EventsClient } from "./events-client";
export const dynamic="force-dynamic";export default function Page(){return <PrivateSection title="Eventos" description="Cliques, acessos, checkouts e eventos do tracker em tempo real."><EventsClient /></PrivateSection>}
