import { BookOpen, HelpCircle, PlugZap, Rocket } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const boxes = [
  {
    href: "/docs/gateways",
    icon: PlugZap,
    title: "Gateways de pagamento",
    desc: "Como enviar vendas para a TrackBase: endpoint, token, payload aceito, status e idempotência. Para FortPay, Hotmart, Kiwify, Utmify e qualquer outro gateway.",
  },
  {
    href: "/docs/pagina",
    icon: Rocket,
    title: "Página de vendas",
    desc: "Como instalar o script de rastreamento, configurar os UTMs dos anúncios e conectar o Pixel com a Conversions API. Guia do dono da página.",
  },
  {
    href: "/docs/faq",
    icon: HelpCircle,
    title: "Perguntas frequentes",
    desc: "Dúvidas comuns: números zerados, token perdido, atribuição por campanha, ROAS, erros de webhook e muito mais.",
  },
] as const;

const links = [
  ["/docs/gateways", "Guia de integração para gateways"],
  ["/docs/pagina", "Instalação do rastreamento na página"],
  ["/docs/faq", "FAQ completo"],
] as const;

export default function DocsIndexPage() {
  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">Bem-vindo à documentação</h2>
        <p className="mt-1 text-sm text-slate-500">A TrackBase une rastreamento no navegador, vendas de gateways e a Marketing API da Meta em um único painel.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {boxes.map(({ href, icon: Icon, title, desc }) => (
          <a key={href} href={href} className="group">
            <Card className="metric-card h-full transition-colors group-hover:border-violet-400/40">
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Icon className="size-5 text-violet-300" />{title}</CardTitle></CardHeader>
              <CardContent><p className="text-sm leading-6 text-slate-400">{desc}</p></CardContent>
            </Card>
          </a>
        ))}
      </div>

      <Card className="metric-card"><CardContent className="p-5">
        <h3 className="flex items-center gap-2 font-semibold"><BookOpen className="size-5 text-violet-300" />Como o fluxo funciona</h3>
        <ol className="mt-4 space-y-2 text-sm leading-6 text-slate-400">
          <li><b className="text-slate-200">1. Instale o script</b> na página de vendas — captura clique do anúncio, PageView, ViewContent e InitiateCheckout com UTMs e <code className="rounded bg-black/30 px-1 text-violet-300">fbclid</code>.</li>
          <li><b className="text-slate-200">2. Ative os UTMs</b> nos anúncios — a campanha, o conjunto e o anúncio são identificados automaticamente.</li>
          <li><b className="text-slate-200">3. Conecte o gateway</b> — cada pagamento aprovado vira um <b className="text-slate-200">Purchase</b> com o mesmo <code className="rounded bg-black/30 px-1 text-violet-300">event_id</code> (deduplicação garantida).</li>
          <li><b className="text-slate-200">4. Conecte o Pixel + CAPI</b><span className="text-slate-500"> (opcional, recomendado)</span> — os eventos também chegam à Meta pelo servidor.</li>
          <li><b className="text-slate-200">5. Acompanhe</b> o dashboard com vendas, funil e ROAS por campanha.</li>
        </ol>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {links.map(([href, label]) => <a key={href} href={href} className="rounded-lg border border-white/10 px-4 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white">{label} →</a>)}
        </div>
      </CardContent></Card>
    </section>
  );
}