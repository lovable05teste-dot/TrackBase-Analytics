"use client";
import { memo, useEffect, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  BarChart3,
  BellRing,
  BookOpen,
  Calculator,
  Check,
  ChevronDown,
  Crosshair,
  EyeOff,
  MessageCircle,
  Moon,
  MousePointerClick,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
  Unlink,
  Webhook,
  WifiOff,
  X,
  Zap,
} from "lucide-react";

/* Troque pelo número oficial. Formato wa.me exige DDI+DDD+numero, sem espaços. */
const WHATSAPP_URL =
  "https://wa.me/5511999999999?text=Quero%20entender%20como%20o%20GhostScale%20rastreia%20minha%20opera%C3%A7%C3%A3o";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 24);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return scrolled;
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="gs-eyebrow">
      <i aria-hidden />
      {children}
    </span>
  );
}

const GhostButton = memo(function GhostButton({
  href,
  children,
  icon,
  variant = "primary",
  external = false,
}: {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
  variant?: "primary" | "quiet";
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={`gs-btn max-w-full ${variant === "primary" ? "gs-btn-primary" : "gs-btn-quiet"}`}
    >
      <span className="min-w-0 text-left">{children}</span>
      <span className="gs-icon-box" aria-hidden>
        {icon ?? <ArrowUpRight className="size-4" strokeWidth={2.5} />}
      </span>
    </a>
  );
});

const tickerSales = [
  ["R$ 297,00", "FortPay", "há 12s"],
  ["R$ 147,00", "Kiwify", "há 31s"],
  ["R$ 497,00", "Hotmart", "há 48s"],
  ["R$ 97,90", "FortPay", "há 1min"],
  ["R$ 1.997,00", "Stripe", "há 2min"],
  ["R$ 197,00", "Braip", "há 3min"],
  ["R$ 347,00", "FlevoPay", "há 4min"],
  ["R$ 67,00", "Utmify", "há 5min"],
];
const tickerWins = [
  "Campanha escala bateu ROAS 4,1x",
  "+312 vendas atribuídas hoje",
  "Clone bloqueado no checkout",
  "CPA caiu 18% esta semana",
  "Pixel e CAPI 100% deduplicados",
  "Site monitorado 24/7 sem queda",
];

const SalesTicker = memo(function SalesTicker() {
  return (
    <div className="relative mt-12 space-y-3 overflow-x-clip">
      <p className="text-center text-[13px] font-medium text-[#C99AA4]">
        Vendas sendo rastreadas agora
      </p>
      <div className="flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <div className="marquee flex w-max items-center gap-3 py-1.5 pr-3">
          {tickerSales.concat(tickerSales).map(([value, gateway, ago], i) => (
            <span
              key={`sales-${i}`}
              aria-hidden={i >= tickerSales.length}
              className="inline-flex shrink-0 items-center gap-2.5 rounded-full border border-white/10 bg-[#150A0D] py-2 pr-4 pl-3 text-xs whitespace-nowrap"
            >
              <span className="size-2 shrink-0 rounded-full bg-[#34D399]" />
              <b className="text-[#7DE8B8]">{value}</b>
              <span className="text-[#C99AA4]">{gateway}</span>
              <span className="text-[#5B6478]">{ago}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <div className="marquee-reverse flex w-max items-center gap-3 py-1.5 pr-3">
          {tickerWins.concat(tickerWins).map((w, i) => (
            <span
              key={`win-${i}`}
              aria-hidden={i >= tickerWins.length}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[.03] px-4 py-2 text-xs whitespace-nowrap text-[#F2C2CB]"
            >
              <TrendingUp className="size-3.5 shrink-0 text-[#FF4D67]" />
              {w}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
});

const ScaleSimulator = memo(function ScaleSimulator() {
  const [invest, setInvest] = useState(5000);
  const [sales, setSales] = useState(120);
  const [ticket, setTicket] = useState(97);
  const revenue = sales * ticket;
  const roas = invest > 0 ? revenue / invest : 0;
  const cpa = sales > 0 ? invest / sales : 0;
  const extra = revenue * 0.12;
  const num = (v: number, setter: (n: number) => void, label: string, prefix = "") => (
    <label className="gs-input block min-w-0 p-4">
      <small className="text-xs text-[#C99AA4]">{label}</small>
      <span className="mt-1 flex min-w-0 items-center gap-1 text-2xl font-bold text-[#FFF3F5]">
        {prefix && <span className="shrink-0 text-sm font-medium text-[#6B7280]">{prefix}</span>}
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={v}
          onChange={(e) => setter(Math.max(0, Number(e.target.value) || 0))}
          className="w-full min-w-0 bg-transparent outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </span>
    </label>
  );
  return (
    <div className="gs-glass gs-top-hi cv-auto mt-8 grid min-w-0 gap-4 overflow-hidden rounded-[24px] p-6 sm:p-8 lg:grid-cols-2">
      <div className="min-w-0">
        <b className="flex items-center gap-2.5 text-lg text-[#FFF3F5]">
          <span className="gs-icon-box">
            <Calculator className="size-4" />
          </span>
          Preencha os dados da sua operação
        </b>
        <p className="mt-2 text-sm leading-relaxed text-[#C99AA4]">
          Coloque os números dos últimos 7 dias e veja a projeção com atribuição correta.
        </p>
        <div className="mt-5 space-y-3">
          {num(invest, setInvest, "Investimento (últimos 7 dias)", "R$")}
          {num(sales, setSales, "Número de vendas")}
          {num(ticket, setTicket, "Ticket médio (R$)", "R$")}
        </div>
      </div>
      <div className="flex min-w-0 flex-col justify-center rounded-[20px] border border-[#FF4D67]/25 bg-gradient-to-b from-[#FF4D67]/[.08] to-transparent p-6">
        <small className="text-[13px] font-semibold text-[#C99AA4]">Sua operação hoje</small>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center sm:gap-3">
          {[
            ["Faturamento", brl(revenue)],
            ["ROAS", `${roas.toFixed(2)}x`],
            ["CPA", brl(cpa)],
          ].map(([l, v]) => (
            <div key={l} className="min-w-0 rounded-xl bg-black/40 p-3">
              <small className="block truncate text-[11px] text-[#C99AA4]">{l}</small>
              <b className="block truncate text-base text-[#FFF3F5] tabular-nums sm:text-lg">{v}</b>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-[#34D399]/25 bg-[#34D399]/[.07] p-4 text-center">
          <small className="text-xs text-[#7DE8B8]/80">Receita extra estimada recuperando 12% em atribuição</small>
          <b className="mt-1 block text-2xl break-words text-[#7DE8B8] tabular-nums sm:text-3xl">
            +{brl(extra)}
            <span className="text-sm font-normal text-[#7DE8B8]/70">/semana</span>
          </b>
        </div>
        <small className="mt-3 text-center text-[11px] text-[#6B7280]">Simulação educativa. Resultados variam por operação.</small>
        <div className="mt-4 text-center">
          <GhostButton href="/login?modo=register">Quero esse rastreio</GhostButton>
        </div>
      </div>
    </div>
  );
});

const PriceCalculator = memo(function PriceCalculator() {
  const [sales, setSales] = useState(1200);
  const plans = [
    { name: "Start", base: 39.9, included: 500 },
    { name: "Pro", base: 69.9, included: 1000 },
    { name: "Scale", base: 89.9, included: 2000 },
    { name: "Black", base: 119.9, included: Infinity },
  ];
  const calc = (p: (typeof plans)[number]) =>
    !Number.isFinite(p.included) ? p.base : p.base + Math.max(0, sales - p.included) * 0.1;
  const best = plans.reduce((a, b) => (calc(a) <= calc(b) ? a : b));
  return (
    <div className="cv-auto mx-auto mt-8 w-full max-w-4xl min-w-0">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => {
          const total = calc(p);
          const isBest = p.name === best.name;
          return (
            <div
              key={p.name}
              className={`min-w-0 rounded-[20px] border p-6 text-left ${
                isBest
                  ? "gs-top-hi border-[#FF4D67]/40 bg-gradient-to-b from-[#FF4D67]/[.08] to-transparent shadow-[0_0_44px_-12px_rgba(255,77,103,.25)]"
                  : "border-white/10 bg-[#150A0D]"
              }`}
            >
              <small className="text-sm text-[#C99AA4]">{p.name}</small>
              <div className="mt-1 flex items-end gap-1">
                <b className="text-2xl font-bold tracking-tight break-words text-[#FFF3F5] tabular-nums sm:text-3xl">
                  {brl(p.base)}
                </b>
                <span className="pb-1 text-xs whitespace-nowrap text-[#6B7280]">/mês</span>
              </div>
              <p className="mt-1 text-xs text-[#C99AA4]">
                {Number.isFinite(p.included) ? `até ${p.included.toLocaleString("pt-BR")} vendas inclusas` : "vendas ilimitadas"}
              </p>
              <p className="mt-2 text-sm text-[#C99AA4]">
                Sua conta: <b className="text-[#7DE8B8] tabular-nums">{brl(total)}</b>
              </p>
              {isBest && (
                <p className="mt-2 inline-block rounded-full border border-[#FF4D67]/30 bg-[#FF4D67]/10 px-2.5 py-1 text-[11px] font-semibold text-[#FF4D67]">
                  Melhor pra você
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div className="mx-auto mt-4 w-full max-w-md min-w-0 rounded-2xl border border-white/10 bg-black/40 p-5 text-left">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-[#C99AA4]">Suas vendas/mês</span>
          <b className="text-lg text-[#FFF3F5] tabular-nums">{sales.toLocaleString("pt-BR")}</b>
        </div>
        <input
          type="range"
          min={50}
          max={20000}
          step={50}
          value={sales}
          onChange={(e) => setSales(Number(e.target.value))}
          className="mt-3 w-full accent-[#FF4D67]"
          aria-label="Vendas por mês"
        />
        <p className="mt-2 text-xs text-[#6B7280]">Excedente: R$ 0,10 por venda aprovada além da franquia. Black sem excedente.</p>
      </div>
      <ul className="mx-auto mt-6 w-full max-w-xs space-y-2.5 text-left text-sm">
        {["Só venda aprovada conta", "Pendente, reembolso e chargeback custam R$0", "CAPI e Pixel incluídos", "Gateways ilimitados", "Cancele quando quiser"].map((f) => (
          <li key={f} className="flex items-center gap-2.5 text-[#F2C2CB]">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#34D399]/15 text-[#7DE8B8]">
              <Check className="size-3" />
            </span>
            <span className="min-w-0">{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-7">
        <GhostButton href="/login?modo=register">Criar conta agora</GhostButton>
      </div>
    </div>
  );
});

const pains = [
  { icon: EyeOff, title: "Pixel cego", desc: "iOS, bloqueadores e restrições comem sua conversão. A venda acontece e o gerenciador nem fica sabendo." },
  { icon: Unlink, title: "Venda sem origem", desc: "UTM quebrada, clique perdido. A campanha roda no escuro e o orçamento vai para onde não vende." },
  { icon: ShieldAlert, title: "Clone no seu checkout", desc: "Copiam sua página, desviam seu tráfego e você paga a conta enquanto outro leva a comissão." },
  { icon: Moon, title: "Campanha ruim ligada de madrugada", desc: "Você dorme e o prejuízo trabalha. Verba queimando em anúncio que já morreu." },
  { icon: WifiOff, title: "Site caiu, anúncio ligado", desc: "Cada clique num site fora do ar é dinheiro jogado fora. E ninguém te avisa." },
  { icon: TrendingDown, title: "ROAS derretendo sem aviso", desc: "Quando você percebe a queda, o lucro de 3 dias já evaporou." },
];

const solutions = [
  { icon: MousePointerClick, title: "Tracking de verdade", desc: "Script leve, webhook e API com normalização automática. Nada se perde no caminho." },
  { icon: Zap, title: "CAPI e Pixel deduplicados", desc: "Navegador e servidor enviam o mesmo event_id. A Meta recebe tudo, sem duplicar nada." },
  { icon: Webhook, title: "Webhook universal", desc: "FortPay, Hotmart, Kiwify, Braip, Stripe e qualquer outro no mesmo endpoint." },
  { icon: Crosshair, title: "Atribuição real por UTM", desc: "Cada venda carrega source, campaign, medium, content e term até o ROAS." },
  { icon: ShieldCheck, title: "Anti-clone e blacklist real", desc: "Snippet anti-iframe com alerta no painel, IPs bloqueados no servidor e bots filtrados." },
  { icon: BarChart3, title: "Funil e heatmap de cliques", desc: "Mapa visual de onde clicam, profundidade de scroll e top elementos por página." },
  { icon: Sparkles, title: "Insights e alertas", desc: "Projeção heurística e regras que pausam campanha ruim e avisam no push." },
  { icon: BellRing, title: "Monitoramento do site", desc: "Checagem no servidor a cada 5 minutos com push quando cai ou volta." },
  { icon: Trophy, title: "Rankings e comunidade", desc: "Badges, níveis e troca com quem vive de tráfego todos os dias." },
];

const compareRows: [string, boolean, string][] = [
  ["Anti-clone com alerta e blacklist no servidor", true, "Não tem"],
  ["CAPI com deduplicação automática", true, "Manual ou parcial"],
  ["Filtragem de bots no servidor", true, "Não tem"],
  ["Webhook universal multi-gateway", true, "Um plugin por checkout"],
  ["Base fixa e R$0,10 só no excedente", true, "Mensalidade e excedentes caros"],
  ["Monitoramento do site com alerta push", true, "Não tem"],
  ["Insights e automação de campanhas", true, "Não tem"],
  ["Setup em 5 minutos, sem programar", true, "Precisa de dev"],
];

const faqs = [
  { q: "Preciso saber programar?", a: "Não. Você cola um script na página e configura o webhook no checkout seguindo o passo a passo em /docs. Em minutos está rastreando." },
  { q: "Funciona com o meu checkout?", a: "Se o seu gateway envia webhook, funciona. FortPay, Hotmart, Kiwify, Braip, Stripe, FlevoPay, Utmify e qualquer outro. O endpoint aceita qualquer formato e detecta os campos sozinho." },
  { q: "E se o pixel for bloqueado?", a: "É exatamente para isso que existe o CAPI. O servidor reenvia cada evento com o mesmo event_id, então a conversão chega na Meta mesmo com iOS restrito ou bloqueador ativo." },
  { q: "Como funciona a taxa de R$ 0,10?", a: "Cada plano inclui uma franquia de vendas (500, 1.000, 2.000, Black ilimitado). Só o que passar paga R$ 0,10 por venda aprovada. Pendente, reembolso, cancelamento e chargeback não geram cobrança." },
  { q: "Posso cancelar quando quiser?", a: "Sim. Sem multa, sem burocracia. Seus dados de eventos e pedidos continuam auditáveis." },
  { q: "Meus dados estão seguros?", a: "Tokens cifrados com AES-GCM, webhooks autenticados por Bearer e payload guardado para auditoria." },
  { q: "Serve para afiliado e agência?", a: "Sim. Projetos separados por operação, atribuição por campanha e rankings para acompanhar cada frente." },
  { q: "Existe suporte?", a: "Sim. Documentação pública em /docs, FAQ e canal de suporte para dúvidas de operação e integração." },
];

const heroPhrases = [
  "dinheiro no seu bolso.",
  "ROAS de verdade.",
  "cada venda atribuída.",
  "lucro sem achismo.",
  "escala com dado real.",
];

function useTypewriter(phrases: string[]) {
  const [text, setText] = useState(phrases[0]);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let phrase = 0;
    let char = phrases[0].length;
    let deleting = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = phrases[phrase];
      if (!deleting) {
        char += 1;
        setText(current.slice(0, char));
        if (char >= current.length) {
          deleting = true;
          timer = setTimeout(tick, 2000);
          return;
        }
        timer = setTimeout(tick, 36 + Math.random() * 48);
      } else {
        char -= 1;
        setText(current.slice(0, char));
        if (char <= 0) {
          deleting = false;
          phrase = (phrase + 1) % phrases.length;
          timer = setTimeout(tick, 380);
          return;
        }
        timer = setTimeout(tick, 15 + Math.random() * 22);
      }
    };
    timer = setTimeout(tick, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return text;
}

export function LandingPage() {
  const scrolled = useScrolled();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const heroText = useTypewriter(heroPhrases);

  return (
    <main className="gs-landing gs-grain min-h-screen w-full max-w-full overflow-x-clip">
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-200 ${
          scrolled ? "border-b border-white/10 bg-[#0C0608]/90 backdrop-blur-md" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-5">
          <a href="#home" className="flex min-w-0 items-center gap-2.5" aria-label="GhostScale início">
            <img
              src="/ghostscale-logo.png"
              alt="Logo GhostScale"
              decoding="async"
              className="h-9 w-auto max-w-[160px] object-contain drop-shadow-[0_0_18px_rgba(255,48,80,.35)] sm:h-11 sm:max-w-[220px]"
            />
          </a>
          <nav className="hidden items-center gap-7 text-sm text-[#C99AA4] md:flex" aria-label="Navegação principal">
            {[
              ["Dores", "#dores"],
              ["Solução", "#solucao"],
              ["Simulador", "#simulador"],
              ["Preços", "#precos"],
              ["FAQ", "#faq"],
            ].map(([label, href]) => (
              <a key={href} href={href} className="transition-colors hover:text-white">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href="/login"
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-[#C99AA4] transition-colors hover:bg-white/5 hover:text-white sm:px-4"
            >
              Entrar
            </a>
            <a
              href="/login?modo=register"
              className="hidden items-center gap-2.5 rounded-xl border border-[#FF4D67]/30 bg-[#FF4D67]/[.06] px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-[#FFF3F5] transition hover:scale-[1.02] hover:border-[#FF4D67]/50 sm:inline-flex"
            >
              Criar conta grátis
              <span className="gs-icon-box !h-7 !w-7 !rounded-[8px]">
                <ArrowUpRight className="size-3.5" strokeWidth={2.5} />
              </span>
            </a>
          </div>
        </div>
      </header>

      <section id="home" className="relative w-full max-w-full overflow-x-clip pt-32 pb-10 sm:pt-36">
        <div className="gs-hero-art pointer-events-none absolute inset-0" aria-hidden />
        <div className="gs-grid-fade pointer-events-none absolute inset-0 opacity-70" aria-hidden />
        <div className="relative mx-auto w-full max-w-6xl min-w-0 px-4 text-center sm:px-5">
          <div className="gs-enter">
            <Eyebrow>Para quem fatura com tráfego pago</Eyebrow>
          </div>
          <h1 className="gs-enter gs-enter-1 mx-auto mt-5 w-full max-w-3xl text-[40px] leading-[1.05] font-extrabold break-words tracking-[-0.03em] text-[#FFF3F5] sm:text-[64px]">
            Saiba exatamente qual anúncio coloca{" "}
            <span className="gs-display gs-gradient-text font-normal italic">{heroText}</span>
            <span className="type-caret" aria-hidden />
          </h1>
          <p className="gs-enter gs-enter-2 mx-auto mt-5 w-full max-w-2xl text-[15px] leading-relaxed text-[#C99AA4] sm:text-lg">
            Pixel e Conversions API deduplicados, webhook universal de vendas e ROAS por campanha, com proteção contra pixel cego e clone.
          </p>
          <div className="gs-enter gs-enter-3 mt-8 flex flex-wrap items-center justify-center gap-3">
            <GhostButton href="/login?modo=register">Criar conta grátis</GhostButton>
            <GhostButton href={WHATSAPP_URL} variant="quiet" external icon={<MessageCircle className="size-4" strokeWidth={2.25} />}>
              Falar com especialista
            </GhostButton>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[13px] text-[#C99AA4]">
            {["Sem cartão de crédito", "Setup em 5 minutos", "Suporte em português"].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <Check className="size-3.5 shrink-0 text-[#34D399]" /> {t}
              </span>
            ))}
          </div>

          <div className="gs-glass gs-top-hi relative mx-auto mt-12 w-full max-w-4xl min-w-0 rounded-[20px] p-4 text-left sm:p-5">
            <div className="flex min-w-0 items-center gap-1.5 border-b border-white/10 pb-3">
              <span className="size-2.5 shrink-0 rounded-full bg-[#3A4358]" />
              <span className="size-2.5 shrink-0 rounded-full bg-[#3A4358]" />
              <span className="size-2.5 shrink-0 rounded-full bg-[#3A4358]" />
              <span className="ml-3 truncate text-xs text-[#6B7280]">painel.ghostscale · tempo real</span>
              <span className="ml-auto hidden shrink-0 items-center gap-1.5 rounded-full border border-[#34D399]/25 bg-[#34D399]/10 px-2.5 py-1 text-[11px] whitespace-nowrap text-[#7DE8B8] sm:inline-flex">
                <span className="size-1.5 rounded-full bg-[#34D399]" /> ao vivo
              </span>
            </div>
            <div className="grid min-w-0 gap-3 pt-4 sm:grid-cols-3">
              {[
                ["Gasto Meta", "R$ 4.820", "12 campanhas ativas"],
                ["Vendas aprovadas", "312", "+18% em relação a ontem"],
                ["ROAS", "3,8x", "R$ 18,4k faturados"],
              ].map(([label, value, sub]) => (
                <div key={label} className="min-w-0 rounded-xl border border-white/10 bg-white/[.03] p-4">
                  <small className="block truncate text-xs text-[#C99AA4]">{label}</small>
                  <b className="mt-1 block truncate text-2xl text-[#FFF3F5] tabular-nums">{value}</b>
                  <small className="block truncate text-[11px] text-[#6B7280]">{sub}</small>
                </div>
              ))}
            </div>
            <div className="mt-3 min-w-0 space-y-2.5 rounded-xl border border-white/10 bg-white/[.02] p-4">
              {[
                ["campanha-escala|2384729384", "92%", "3,8x"],
                ["oferta-inverno|2384729102", "64%", "2,9x"],
                ["teste-criativo-c|2384729555", "38%", "1,7x"],
              ].map(([name, w, roas]) => (
                <div key={name} className="flex min-w-0 items-center gap-3 text-xs">
                  <span className="w-24 shrink-0 truncate text-[#C99AA4] sm:w-44">{name}</span>
                  <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div className="bar-anim h-full rounded-full bg-gradient-to-r from-[#FF4D67]/70 to-[#A3122B]" style={{ width: w }} />
                  </div>
                  <b className="w-10 shrink-0 text-right text-[#FFF3F5] tabular-nums">{roas}</b>
                </div>
              ))}
            </div>
            <div className="mt-3 flex min-w-0 items-center gap-3 rounded-xl border border-[#FF4D67]/25 bg-gradient-to-r from-[#FF0030]/[.09] to-transparent p-3.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#FF0030]/15 text-[#FF8FA3]">
                <Sparkles className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-xs font-semibold text-[#FFF3F5]">
                  Insight IA
                  <span className="rounded-md bg-[#FF0030]/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-[#FF8FA3]">BETA</span>
                </p>
                <p className="mt-0.5 truncate text-xs text-[#C99AA4]">
                  Pausar <b className="font-semibold text-[#FFF3F5]">teste-criativo-c</b> economiza ~R$ 38/dia com o mesmo faturamento.
                </p>
              </div>
              <span className="hidden shrink-0 items-center gap-1.5 text-[11px] font-medium whitespace-nowrap text-[#7DE8B8] sm:inline-flex">
                <span className="size-1.5 animate-pulse rounded-full bg-[#34D399]" /> 98% confiança
              </span>
            </div>
          </div>
        </div>

        <SalesTicker />
      </section>

      <section id="dores" className="cv-auto mx-auto w-full max-w-6xl min-w-0 scroll-mt-20 px-4 py-16 sm:px-5 sm:py-24">
        <Eyebrow>O que está travando sua operação</Eyebrow>
        <h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight break-words text-[#FFF3F5] sm:text-4xl">
          O lucro some entre o clique e a venda.
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[#C99AA4]">
          Se qualquer item abaixo parece familiar, o rastreio atual está custando dinheiro todo dia.
        </p>
        <div className="mt-8 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pains.map((p) => (
            <div key={p.title} className="gs-card group min-w-0 p-6">
              <span className="gs-icon-box !h-11 !w-11">
                <p.icon className="size-5" />
              </span>
              <b className="mt-4 block text-[#FFF3F5]">{p.title}</b>
              <p className="mt-1.5 text-sm leading-relaxed text-[#C99AA4]">{p.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <a href="#solucao" className="text-sm font-semibold text-[#FF4D67] underline decoration-[#FF4D67]/30 underline-offset-4 hover:decoration-[#FF4D67]/60">
            Ver como o GhostScale resolve
          </a>
        </div>
      </section>

      <section id="solucao" className="cv-auto w-full scroll-mt-20 border-y border-white/10 bg-[#150A0D]/60 py-16 sm:py-24">
        <div className="mx-auto w-full max-w-6xl min-w-0 px-4 sm:px-5">
          <Eyebrow>Como o GhostScale resolve</Eyebrow>
          <h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight break-words text-[#FFF3F5] sm:text-4xl">
            Do clique ao saque com atribuição fechada.
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[#C99AA4]">
            Cada recurso abaixo existe no painel e funciona em conjunto, não em quatro ferramentas separadas.
          </p>
          <div className="mt-8 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {solutions.map((s) => (
              <div key={s.title} className="gs-card min-w-0 bg-[#0C0608] p-6">
                <span className="gs-icon-box !h-11 !w-11">
                  <s.icon className="size-5" />
                </span>
                <b className="mt-4 block text-[#FFF3F5]">{s.title}</b>
                <p className="mt-1.5 text-sm leading-relaxed text-[#C99AA4]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="diferencial" className="cv-auto mx-auto w-full max-w-4xl min-w-0 scroll-mt-20 px-4 py-16 sm:px-5 sm:py-24">
        <Eyebrow>GhostScale na prática</Eyebrow>
        <h2 className="mt-4 text-3xl font-bold tracking-tight break-words text-[#FFF3F5] sm:text-4xl">
          Por que não é só mais um tracker
        </h2>
        <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10 bg-[#150A0D]">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="bg-white/[.03]">
                <th scope="col" className="p-4 text-left font-medium text-[#C99AA4]">Funcionalidade</th>
                <th scope="col" className="p-4 text-center font-semibold whitespace-nowrap text-[#FF4D67]">GhostScale</th>
                <th scope="col" className="p-4 text-center font-medium whitespace-nowrap text-[#6B7280]">Trackers comuns</th>
              </tr>
            </thead>
            <tbody>
              {compareRows.map(([f, ok, other]) => (
                <tr key={f} className="border-t border-white/10">
                  <td className="p-4 text-[#FFF3F5]">{f}</td>
                  <td className="p-4 text-center">
                    {ok && (
                      <span className="inline-grid size-7 place-items-center rounded-full border border-[#FF4D67]/30 bg-[#FF4D67]/10 text-[#FF4D67]">
                        <Check className="size-4" strokeWidth={3} />
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-[#6B7280]">
                      <X className="size-4 shrink-0 opacity-60" /> {other}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-8 text-center">
          <a href="/login?modo=register" className="text-sm font-semibold text-[#FF4D67] underline decoration-[#FF4D67]/30 underline-offset-4 hover:decoration-[#FF4D67]/60">
            Experimentar na minha operação
          </a>
        </div>
      </section>

      <section id="simulador" className="cv-auto w-full scroll-mt-20 border-y border-white/10 bg-[#150A0D]/60 py-16 sm:py-24">
        <div className="mx-auto w-full max-w-4xl min-w-0 px-4 sm:px-5">
          <Eyebrow>Simulador de escala</Eyebrow>
          <h2 className="mt-4 text-3xl font-bold tracking-tight break-words text-[#FFF3F5] sm:text-4xl">
            Quanto você recupera com atribuição correta
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[#C99AA4]">
            Venda sem origem vira otimização errada. Recupere a atribuição e o algoritmo volta a trabalhar a seu favor.
          </p>
          <ScaleSimulator />
        </div>
      </section>

      <section id="como-funciona" className="cv-auto mx-auto w-full max-w-6xl min-w-0 scroll-mt-20 px-4 py-16 sm:px-5 sm:py-24">
        <Eyebrow>Instalação em minutos</Eyebrow>
        <h2 className="mt-4 text-3xl font-bold tracking-tight break-words text-[#FFF3F5] sm:text-4xl">Do clique ao ROAS em 3 passos</h2>
        <div className="mt-8 grid min-w-0 gap-4 lg:grid-cols-3">
          {[
            { n: "01", t: "Crie seu projeto", d: "Cadastre o domínio e cole o script de tracking. Leva menos de 5 minutos, sem programador.", code: '<script src="https://seu-app/tracker.js?key=SUA_KEY"></script>' },
            { n: "02", t: "Conecte tudo", d: "Pixel e CAPI na Meta e webhook no checkout. Cada venda passa a chegar com origem completa.", code: "POST /api/webhooks/gateway  ->  { received: true }" },
            { n: "03", t: "Ative e escale", d: "Acompanhe vendas em tempo real, receba alertas e escale a campanha que prova lucro.", code: "ROAS por campanha, todo dia, sem planilha" },
          ].map((s) => (
            <div key={s.n} className="gs-card min-w-0 p-6">
              <b className="gs-display text-[44px] leading-none text-[#FF4D67]/80">{s.n}</b>
              <b className="mt-3 block text-lg text-[#FFF3F5]">{s.t}</b>
              <p className="mt-1.5 text-sm leading-relaxed text-[#C99AA4]">{s.d}</p>
              <code
                className="mt-4 block w-full max-w-full overflow-x-auto rounded-xl border border-white/10 bg-black/50 p-3 text-[11px] leading-relaxed break-all text-[#7DE8B8]"
                style={{ fontFamily: "'JetBrains Mono',monospace" }}
              >
                {s.code}
              </code>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <GhostButton href="/login?modo=register">Começar agora</GhostButton>
          <GhostButton href="/docs" variant="quiet" icon={<BookOpen className="size-4" strokeWidth={2.25} />}>
            Ler documentação
          </GhostButton>
        </div>
      </section>

      <section id="precos" className="cv-auto w-full scroll-mt-20 border-y border-white/10 bg-[#150A0D]/60 py-16 sm:py-24">
        <div className="mx-auto w-full max-w-6xl min-w-0 px-4 text-center sm:px-5">
          <Eyebrow>Preço transparente</Eyebrow>
          <h2 className="mx-auto mt-4 max-w-xl text-3xl font-bold tracking-tight break-words text-[#FFF3F5] sm:text-4xl">
            4 planos. Sem letra miúda.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-[#C99AA4]">
            Base fixa e R$ 0,10 só no excedente. Arraste e veja qual fecha mais barato para o seu volume.
          </p>
          <PriceCalculator />
        </div>
      </section>

      <section id="faq" className="cv-auto mx-auto w-full max-w-3xl min-w-0 scroll-mt-20 px-4 py-16 sm:px-5 sm:py-24">
        <Eyebrow>Dúvidas comuns</Eyebrow>
        <h2 className="mt-4 text-3xl font-bold tracking-tight break-words text-[#FFF3F5] sm:text-4xl">Perguntas e respostas</h2>
        <div className="mt-8 min-w-0 space-y-3">
          {faqs.map((f, i) => {
            const open = openFaq === i;
            return (
              <div
                key={f.q}
                className={`min-w-0 overflow-hidden rounded-2xl border transition-colors duration-200 ${
                  open ? "border-[#FF4D67]/30 bg-[#FF4D67]/[.04]" : "border-white/10 bg-[#150A0D] hover:border-white/25"
                }`}
              >
                <button
                  onClick={() => setOpenFaq(open ? null : i)}
                  aria-expanded={open}
                  className="flex w-full min-w-0 items-center justify-between gap-4 p-5 text-left font-medium text-[#FFF3F5]"
                >
                  <span className="min-w-0 flex-1">{f.q}</span>
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-[10px] border transition-transform duration-200 ${
                      open ? "rotate-180 border-[#FF4D67]/40 bg-[#FF4D67] text-[#0C0608]" : "border-white/10 bg-white/5 text-[#C99AA4]"
                    }`}
                  >
                    <ChevronDown className="size-4" />
                  </span>
                </button>
                <div className="gs-faq-grid" data-open={open}>
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm leading-relaxed text-[#C99AA4]">{f.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="cv-auto mx-auto w-full max-w-6xl min-w-0 px-4 pb-16 sm:px-5 sm:pb-24">
        <div className="gs-glass gs-top-hi relative min-w-0 overflow-hidden rounded-[24px] p-8 text-center sm:p-14">
          <div className="gs-hero-art pointer-events-none absolute inset-0" aria-hidden />
          <h2 className="relative mx-auto max-w-2xl text-3xl font-bold tracking-tight break-words text-[#FFF3F5] sm:text-5xl">
            Pare de perder venda. <span className="gs-display gs-gradient-text font-normal italic">Escale no dado.</span>
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-[#C99AA4]">
            Teste sem compromisso. Só continua quem vê resultado, e resultado aqui aparece no primeiro dia.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <GhostButton href="/login?modo=register">Criar conta grátis agora</GhostButton>
            <GhostButton href={WHATSAPP_URL} variant="quiet" external icon={<MessageCircle className="size-4" strokeWidth={2.25} />}>
              Falar com especialista
            </GhostButton>
          </div>
          <p className="relative mt-5 text-xs text-[#6B7280]">Sem cartão · Setup em 5 min · Cancele quando quiser</p>
        </div>
      </section>

      <footer className="w-full border-t border-white/10 bg-[#0C0608] py-10">
        <div className="mx-auto grid w-full max-w-6xl min-w-0 gap-8 px-4 sm:px-5 sm:grid-cols-2 md:grid-cols-[1.2fr_.8fr_.8fr_.8fr]">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2.5">
              <img
                src="/ghostscale-logo.png"
                alt="Logo GhostScale"
                loading="lazy"
                decoding="async"
                className="h-9 w-auto max-w-[160px] object-contain drop-shadow-[0_0_18px_rgba(255,48,80,.3)] sm:h-11 sm:max-w-[220px]"
              />
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-[#C99AA4]">Mais que tracking. A operação de quem vive de tráfego pago.</p>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#FF4D67] underline decoration-[#FF4D67]/30 underline-offset-4 hover:decoration-[#FF4D67]/60"
            >
              <MessageCircle className="size-4" /> Falar com especialista
            </a>
          </div>
          {[
            ["Produto", [["Dores", "#dores"], ["Solução", "#solucao"], ["Simulador", "#simulador"], ["Preços", "#precos"], ["FAQ", "#faq"]]],
            ["Painel", [["Entrar", "/login"], ["Criar conta", "/login?modo=register"], ["Documentação", "/docs"], ["Guia gateways", "/docs/gateways"]]],
            ["Integrações", [["FortPay", "/docs/gateways"], ["Hotmart", "/docs/gateways"], ["Kiwify", "/docs/gateways"], ["Braip", "/docs/gateways"]]],
          ].map(([title, links]) => (
            <div key={title as string} className="min-w-0">
              <b className="text-sm text-[#FFF3F5]">{title}</b>
              <ul className="mt-3 space-y-2 text-sm text-[#C99AA4]">
                {(links as string[][]).map(([label, href]) => (
                  <li key={label}>
                    <a href={href} className="transition-colors hover:text-white">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-8 w-full max-w-6xl px-4 text-xs text-[#6B7280] sm:px-5">© 2026 GhostScale. Todos os direitos reservados.</p>
      </footer>
    </main>
  );
}
