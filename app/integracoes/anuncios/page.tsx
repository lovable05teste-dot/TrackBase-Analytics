import { AppShell } from "@/components/AppShell";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <AppShell title="Integrações de Anúncio" subtitle="Conecte Meta, TikTok e gateways num só lugar.">
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Meta Ads", "Pixel + CAPI + contas de anúncio.", "/integracoes", "Conectar Meta"],
          ["Gateways", "FortPay, Hotmart, Kiwify, Utmify via webhook.", "/integracoes/gateways", "Ver gateways"],
          ["TikTok", "Pixel TT + UTMs tt para multi-canal.", "/ferramentas/ativador-tiktok", "Ativar TikTok"],
        ].map(([k, d, h, cta]) => (
          <div key={k} className="metric-card rounded-xl p-6"><b>{k}</b><p className="mt-2 text-sm text-slate-400">{d}</p><a href={h} className="mt-4 block rounded-lg bg-violet-600 px-4 py-2 text-center text-sm font-medium hover:bg-violet-500">{cta}</a></div>
        ))}
      </div>
    </AppShell>
  );
}
