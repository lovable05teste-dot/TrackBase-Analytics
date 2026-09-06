import { PrivateSection } from "../private-section";
import { MetaAccountsClient } from "./accounts-client";
export const dynamic = "force-dynamic";

export default function MetaAccounts() {
  return <PrivateSection title="Contas Meta" description="Conexão com o Gerenciador de Anúncios">
    <section className="metric-card max-w-3xl rounded-xl p-6 space-y-5">
      <div><h2 className="text-xl font-semibold">Conta de anúncios</h2><p className="mt-2 text-slate-400">Autorize a TrackBase e escolha a conta que será usada para campanhas e métricas.</p></div>
      <MetaAccountsClient/>
    </section>
  </PrivateSection>;
}
