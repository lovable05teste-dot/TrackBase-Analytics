import { AppShell } from "@/components/AppShell";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <AppShell title="Assinatura Avançado (TikTok + Meta)" subtitle="Atribuição multi-canal: Meta + TikTok no mesmo dashboard.">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="metric-card rounded-xl p-6">
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-300">TikTok + Meta</span>
          <h3 className="mt-3 text-xl font-semibold">Scale Multi-Canal — R$ 297/mês</h3>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            <li>✓ Tudo do Scale</li>
            <li>✓ Ativador Pixel TikTok + eventos TikTok</li>
            <li>✓ UTMs separadas por canal (fb vs tt)</li>
            <li>✓ Atribuição comparada Meta × TikTok</li>
            <li>✓ Agent Hub multi-canal</li>
          </ul>
          <a href="/ferramentas/ativador-tiktok" className="mt-5 block rounded-lg bg-violet-600 px-4 py-2.5 text-center text-sm font-medium hover:bg-violet-500">Ativar TikTok agora</a>
        </div>
        <div className="metric-card rounded-xl p-6">
          <b>Como funciona o multi-canal</b>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-300">
            <li>Use <a href="/ferramentas/utm-builder" className="text-violet-300 underline">UTM Builder</a> com <code>utm_source=tiktok</code> nos anúncios TT.</li>
            <li>Instale o <a href="/ferramentas/ativador-tiktok" className="text-violet-300 underline">Pixel TikTok</a> junto ao tracker TrackBase.</li>
            <li>Compare em <a href="/relatorios/utms" className="text-violet-300 underline">Relatórios de UTMs</a> e <a href="/atribuicao" className="text-violet-300 underline">Atribuição</a>.</li>
          </ol>
        </div>
      </div>
    </AppShell>
  );
}
