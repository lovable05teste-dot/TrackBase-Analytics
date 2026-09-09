import { PrivateSection } from "../private-section";
import { LabClient } from "./lab-client";
export const dynamic = "force-dynamic";

export default function MetaLab() {
  return <PrivateSection title="Meta Lab" description="Diagnóstico, regras automáticas, públicos e histórico da Meta Ads">
    <LabClient/>
  </PrivateSection>;
}
