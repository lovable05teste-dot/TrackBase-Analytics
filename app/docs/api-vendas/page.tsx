import { PrivateSection } from "../../private-section";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <PrivateSection title="Docs API Vendas" description="Endpoint universal para gateways enviarem vendas.">
      <div className="grid gap-4">
        <div className="metric-card rounded-xl p-5">
          <b>POST {"{BASE_URL}"}/api/webhooks/gateway</b>
          <p className="mt-2 text-sm text-slate-400">Autenticação: <code className="text-sky-300">Authorization: Bearer tb_live_...</code> (ou <code>X-TrackBase-Key</code> ou <code>?token=</code>). Gere o token em <a href="/integracoes" className="text-violet-300 underline">Integrações → Gateways</a>.</p>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-black/40 p-4 text-xs leading-6 text-sky-300">{`{
  "id": "TX123456",
  "transaction_id": "TX123456",
  "status": "approved", // approved | pending | refunded | cancelled | chargeback
  "amount": 197.0,
  "currency": "BRL",
  "tracking": {
    "utm_source": "facebook",
    "utm_campaign": "CBO_KIT_01",
    "utm_content": "criativo-03",
    "fbclid": "IwAR..."
  }
}`}</pre>
          <p className="mt-3 text-sm text-slate-400">Resposta: <code className="text-emerald-300">200 {"{received:true, orderId, status, event}"}</code>. Reenvios atualizam o pedido (idempotente por provider + external_id). Teste em <a href="/webhooks" className="text-violet-300 underline">/webhooks</a>.</p>
        </div>
        <div className="metric-card rounded-xl p-5 text-sm leading-6 text-slate-300">
          <b>Guia completo</b>
          <p className="mt-2">Veja <a href="/docs/gateways" className="text-violet-300 underline">/docs/gateways</a> para FortPay, Hotmart, Kiwify e Utmify, com exemplos cURL e tabela de status.</p>
        </div>
      </div>
    </PrivateSection>
  );
}
