import { PrivateSection } from "../private-section";
import { OfferLabClient } from "./offer-lab-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <PrivateSection title="Offer Lab" description="Teste variações de oferta, preço e hook com método.">
      <OfferLabClient />
    </PrivateSection>
  );
}
