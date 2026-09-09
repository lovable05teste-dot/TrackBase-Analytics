import { AppShell } from "@/components/AppShell";
import { OfferLabClient } from "./offer-lab-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <AppShell title="Offer Lab" subtitle="Teste variações de oferta, preço e hook com método.">
      <OfferLabClient />
    </AppShell>
  );
}
