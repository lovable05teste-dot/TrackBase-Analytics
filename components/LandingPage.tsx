"use client";
import { memo, useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  BookOpen,
  Calculator,
  Check,
  ChevronDown,
  Crosshair,
  EyeOff,
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

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

/* Sem cursor customizado: usa a seta padrão do sistema (preta).
   Nenhum mousemove / rAF / trail branco aqui — era o que travava o PC. */

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

function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll(".reveal"));
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("reveal-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("reveal-visible");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <small className="reveal text-xs font-semibold uppercase tracking-[0.2em] text-[#ff3b5c]">
      {children}
    </small>
  );
}

/* Headline isolada: o typewriter re-renderiza SÓ este componente,
   não a página inteira (era isso que travava tudo). */
const heroPhrases = [
  "dinheiro no seu bolso.",
  "ROAS de verdade.",
  "escala sem achismo.",
  "lucro previsível.",
];

const HeroHeadline = memo(function HeroHeadline() {
  const [text, setText] = useState(heroPhrases[0]);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let phrase = 0;
    let chars = heroPhrases[0].length;
    let deleting = true;
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      if (deleting) {
        chars -= 1;
        setText(heroPhrases[phrase].slice(0, Math.max(0, chars)));
        if (chars <= 0) {
          deleting = false;
          phrase = (phrase + 1) % heroPhrases.length;
          timer = setTimeout(tick, 350);
        } else {
          timer = setTimeout(tick, 26);
        }
      } else {
        const next = heroPhrases[phrase];
        chars += 1;
        setText(next.slice(0, chars));
        if (chars >= next.length) {
          deleting = true;
          timer = setTimeout(tick, 2300);
        } else {
          timer = setTimeout(tick, 55);
        }
      }
    };
    timer = setTimeout(tick, 2300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);
  return (
    <span className="text-[#ff3b5c]">
      {text}
      <span className="type-caret" aria-hidden />
    </span>
  );
});

/* Chuva de métricas — sem blur, sem scale gigante, sem overflow.
   Só transform GPU barato. */
const ctaMetrics = [
  "ROAS 4,2x",
  "+312 vendas hoje",
  "CPA −18%",
  "R$ 18,4k faturados",
  "Atribuição 100%",
  "Chargeback −32%",
  "Ticket +24%",
  "Pixel + CAPI ativos",
];

const MetricsRain = memo(function MetricsRain() {
  const row = (items: string[], reverse: boolean, label: string) => (
    <div className="flex overflow-hidden">
      <div className={`flex w-max items-center gap-3 py-2 pr-3 ${reverse ? "marquee-reverse" : "marquee"}`}>
        {items.concat(items).map((m, i) => (
          <span
            key={`${label}-${i}`}
            aria-hidden={i >= items.length}
            className="shrink-0 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide whitespace-nowrap text-white/85"
          >
            {m}
          </span>
        ))}
      </div>
    </div>
  );
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-2 overflow-hidden opacity-60" aria-hidden>
      <div className="-rotate-2">{row(ctaMetrics, false, "a")}</div>
      <div className="rotate-1">{row(ctaMetrics.slice().reverse(), true, "b")}</div>
      <div className="-rotate-1">{row(ctaMetrics.slice(3).concat(ctaMetrics.slice(0, 3)), false, "c")}</div>
    </div>
  );
});

/* CTA sem efeito pesado na seta: seta estática, sem scale 1.35 / sem glow.
   Só um translate leve no hover (GPU). */
const ArrowCta = memo(function ArrowCta({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost" | "light";
}) {
  const styles =
    variant === "primary"
      ? "bg-[#ff0030] text-white hover:bg-[#d60029]"
      : variant === "light"
        ? "bg-white text-[#0b0e17] hover:bg-red-50"
        : "border border-white/15 text-slate-200 hover:border-white/30 hover:bg-white/5";
  return (
    <a
      href={href}
      className={`group inline-flex max-w-full items-center gap-3 rounded-2xl px-6 py-4 text-[15px] font-semibold transition-colors duration-200 active:scale-[.98] ${styles}`}
    >
      <span className="min-w-0">{children}</span>
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-full ${
          variant === "light"
            ? "bg-[#ff0030]/10 text-[#ff0030]"
            : "bg-white/20 text-white"
        }`}
      >
        <ArrowRight className="size-4" strokeWidth={2.75} />
      </span>
    </a>
  );
});

/* Ticker — sem animate-ping, sem backdrop-blur (os 2 maiores vilões de FPS).
   Pontinho estático verde, marquee só com transform. */
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
  "Pixel + CAPI 100% deduplicados",
  "Site monitorado 24/7 sem queda",
];

const SalesTicker = memo(function SalesTicker() {
  return (
    <div className="relative mt-12 space-y-3 overflow-x-clip">
      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
        Vendas sendo rastreadas agora
      </p>
      <div className="flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <div className="marquee flex w-max items-center gap-3 py-1.5 pr-3">
          {tickerSales.concat(tickerSales).map(([value, gateway, ago], i) => (
            <span
              key={`sales-${i}`}
              aria-hidden={i >= tickerSales.length}
              className="inline-flex shrink-0 items-center gap-2.5 rounded-full border border-white/10 bg-[#0b0e17] py-2 pr-4 pl-3 text-xs whitespace-nowrap"
            >
              <span className="size-2 shrink-0 rounded-full bg-emerald-400" />
              <b className="text-emerald-300">{value}</b>
              <span className="text-slate-400">{gateway}</span>
              <span className="text-slate-600">{ago}</span>
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
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#ff0030]/20 bg-[#ff0030]/[.06] px-4 py-2 text-xs whitespace-nowrap text-slate-300"
            >
              <TrendingUp className="size-3.5 shrink-0 text-[#ff3b5c]" />
              {w}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
});

/* Simulador — inputs com min-w-0 pra nunca estourar no mobile */
const ScaleSimulator = memo(function ScaleSimulator() {
  const [invest, setInvest] = useState(5000);
  const [sales, setSales] = useState(120);
  const [ticket, setTicket] = useState(97);
  const revenue = sales * ticket;
  const roas = invest > 0 ? revenue / invest : 0;
  const cpa = sales > 0 ? invest / sales : 0;
  const extra = revenue * 0.12;
  const num = (v: number, setter: (n: number) => void, label: string, prefix = "") => (
    <label className="block min-w-0 rounded-2xl border border-white/10 bg-black/40 p-4 transition-colors focus-within:border-[#ff0030]/50">
      <small className="text-xs text-slate-500">{label}</small>
      <span className="mt-1 flex min-w-0 items-center gap-1 text-2xl font-bold">
        {prefix && <span className="shrink-0 text-sm text-slate-500">{prefix}</span>}
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
    <div className="reveal cv-auto mt-8 grid min-w-0 gap-4 overflow-hidden rounded-3xl border border-white/10 bg-[#0b0e17] p-6 sm:p-8 lg:grid-cols-2">
      <div className="min-w-0">
        <b className="flex items-center gap-2 text-lg"><Calculator className="size-5 shrink-0 text-[#ff3b5c]" /> Preencha os dados da sua operação</b>
        <p className="mt-1 text-sm text-slate-500">Arraste a realidade pra dentro e veja a projeção com atribuição correta.</p>
        <div className="mt-5 space-y-3">
          {num(invest, setInvest, "Investimento (últimos 7 dias)", "R$")}
          {num(sales, setSales, "Número de vendas")}
          {num(ticket, setTicket, "Ticket médio (R$)", "R$")}
        </div>
      </div>
      <div className="flex min-w-0 flex-col justify-center rounded-2xl border border-[#ff0030]/25 bg-gradient-to-b from-[#ff0030]/10 to-transparent p-6">
        <small className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Sua operação hoje</small>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center sm:gap-3">
          {[
            ["Faturamento", brl(revenue)],
            ["ROAS", `${roas.toFixed(2)}x`],
            ["CPA", brl(cpa)],
          ].map(([l, v]) => (
            <div key={l} className="min-w-0 rounded-xl bg-black/40 p-3">
              <small className="block truncate text-[11px] text-slate-500">{l}</small>
              <b className="block truncate text-base sm:text-lg">{v}</b>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-emerald-400/25 bg-emerald-400/[.07] p-4 text-center">
          <small className="text-xs text-emerald-300/80">Receita extra estimada recuperando 12% em atribuição</small>
          <b className="mt-1 block text-2xl break-words text-emerald-300 sm:text-3xl">+{brl(extra)}<span className="text-sm font-normal text-emerald-300/70">/semana</span></b>
        </div>
        <small className="mt-3 text-center text-[11px] text-slate-600">Simulação educativa. Resultados variam por operação.</small>
        <div className="mt-4 text-center"><ArrowCta href="/login?modo=register">Quero esse rastreio</ArrowCta></div>
      </div>
    </div>
  );
});

/* Calculadora do preço — 4 planos + R$0,10 excedente */
const PriceCalculator = memo(function PriceCalculator() {
  const [sales, setSales] = useState(1200);
  const plans = [
    { name: "Start", base: 39.9, included: 500 },
    { name: "Pro", base: 69.9, included: 1000 },
    { name: "Scale", base: 89.9, included: 2000 },
    { name: "Black", base: 119.9, included: Infinity },
  ];
  const calc = (p: typeof plans[number]) =>
    !Number.isFinite(p.included) ? p.base : p.base + Math.max(0, sales - p.included) * 0.1;
  const best = plans.reduce((a, b) => (calc(a) <= calc(b) ? a : b));
  return (
    <div className="reveal cv-auto mx-auto mt-8 w-full max-w-4xl min-w-0">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => {
          const total = calc(p);
          const isBest = p.name === best.name;
          return (
            <div key={p.name} className={`min-w-0 rounded-3xl border p-6 text-left ${isBest ? "border-[#ff0030]/50 bg-gradient-to-b from-[#ff0030]/10 to-transparent" : "border-white/10 bg-black/40"}`}>
              <small className="text-sm text-slate-400">{p.name}</small>
              <div className="mt-1 flex items-end gap-1">
                <b className="text-2xl font-bold tracking-tight break-words sm:text-3xl">{brl(p.base)}</b>
                <span className="pb-1 text-xs whitespace-nowrap text-slate-500">/mês</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{Number.isFinite(p.included) ? `até ${p.included.toLocaleString("pt-BR")} vendas inclusas` : "vendas ilimitadas"}</p>
              <p className="mt-2 text-sm">Sua conta: <b className="text-emerald-300">{brl(total)}</b></p>
              {isBest && <p className="mt-1 text-[11px] font-semibold text-[#ff3b5c]">Melhor pra você</p>}
            </div>
          );
        })}
      </div>
      <div className="mx-auto mt-4 w-full max-w-md min-w-0 rounded-2xl bg-black/40 p-5 text-left">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-slate-400">Suas vendas/mês</span>
          <b className="text-lg tabular-nums">{sales.toLocaleString("pt-BR")}</b>
        </div>
        <input
          type="range"
          min={50}
          max={20000}
          step={50}
          value={sales}
          onChange={(e) => setSales(Number(e.target.value))}
          className="mt-3 w-full accent-[#ff0030]"
          aria-label="Vendas por mês"
        />
        <p className="mt-2 text-xs text-slate-500">Excedente: R$ 0,10 por venda aprovada além da franquia. Black sem excedente.</p>
      </div>
      <ul className="mx-auto mt-6 w-full max-w-xs space-y-2.5 text-left text-sm">
        {["Só venda aprovada conta", "Pendente/reembolso/chargeback = R$0", "CAPI + Pixel incluídos", "Gateways ilimitados", "Cancele quando quiser"].map((f) => (
          <li key={f} className="flex items-center gap-2.5 text-slate-300">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
              <Check className="size-3" />
            </span>
            <span className="min-w-0">{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-7"><ArrowCta href="/login?modo=register">Criar conta agora</ArrowCta></div>
    </div>
  );
});

const pains = [
  { icon: EyeOff, title: "Pixel cego", desc: "iOS, bloqueadores e restrições comem sua conversão. A venda acontece e o gerenciador nem fica sabendo." },
  { icon: Unlink, title: "Venda sem origem", desc: "UTM quebrada, clique perdido. Campanha roda no escuro e o orçamento vai pra onde não vende." },
  { icon: ShieldAlert, title: "Clone no seu checkout", desc: "Copiam sua página, desviam seu tráfego e você paga a conta enquanto outro leva a comissão." },
  { icon: Moon, title: "Campanha ruim ligada de madrugada", desc: "Você dorme e o prejuízo trabalha: verba queimando em anúncio que já morreu." },
  { icon: WifiOff, title: "Site caiu, anúncio ligado", desc: "Cada clique num site fora do ar é dinheiro jogado fora — e ninguém te avisa." },
  { icon: TrendingDown, title: "ROAS derretendo sem aviso", desc: "Quando você percebe a queda, o lucro de 3 dias já evaporou." },
];

const solutions = [
  { icon: MousePointerClick, title: "Tracking de verdade", desc: "Script leve + webhook + API com normalização automática. Nada se perde no caminho." },
  { icon: Zap, title: "CAPI + Pixel deduplicados", desc: "Navegador e servidor enviam o mesmo event_id. A Meta recebe tudo, sem duplicar nada." },
  { icon: Webhook, title: "Webhook universal", desc: "FortPay, Hotmart, Kiwify, Braip, Stripe e qualquer outro no mesmo endpoint." },
  { icon: Crosshair, title: "Atribuição real por UTM", desc: "Cada venda carrega source, campaign, medium, content e term até o ROAS." },
  { icon: ShieldCheck, title: "Anti-clone + blacklist real", desc: "Snippet anti-iframe com alerta no painel, IPs bloqueados no servidor e bots filtrados automaticamente." },
  { icon: BarChart3, title: "Funil + heatmap de cliques", desc: "Mapa visual de onde clicam, profundidade de scroll e top elementos por página." },
  { icon: Sparkles, title: "Insights + alertas", desc: "Projeção heurística e regras que pausam campanha ruim e avisam no push." },
  { icon: BellRing, title: "Monitoramento do site", desc: "Checagem no servidor a cada 5 minutos com push quando cai ou volta." },
  { icon: Trophy, title: "Rankings + comunidade", desc: "Badges, níveis e troca com quem vive de tráfego todos os dias." },
];

const compareRows: [string, boolean, string][] = [
  ["Anti-clone com alerta + blacklist no servidor", true, "Não tem"],
  ["CAPI com deduplicação automática", true, "Manual ou parcial"],
  ["Filtragem de bots no servidor", true, "Não tem"],
  ["Webhook universal multi-gateway", true, "Um plugin por checkout"],
  ["Base fixa + R$0,10 só no excedente", true, "Mensalidade + excedentes caros"],
  ["Monitoramento do site com alerta push", true, "Não tem"],
  ["Insights + automação de campanhas", true, "Não tem"],
  ["Setup em 5 minutos, sem programar", true, "Precisa de dev"],
];

const faqs = [
  { q: "Preciso saber programar?", a: "Não. Você cola um script na página e configura o webhook no checkout seguindo o passo a passo em /docs. Em minutos está rastreando." },
  { q: "Funciona com o meu checkout?", a: "Se o seu gateway envia webhook, funciona. FortPay, Hotmart, Kiwify, Braip, Stripe, FlevoPay, Utmify e qualquer outro — o endpoint aceita qualquer formato e detecta os campos sozinho." },
  { q: "E se o pixel for bloqueado?", a: "É exatamente pra isso que existe o CAPI: o servidor reenvia cada evento com o mesmo event_id, então a conversão chega na Meta mesmo com iOS restrito ou bloqueador ativo." },
  { q: "Como funciona a taxa de R$ 0,10?", a: "Cada plano inclui uma franquia de vendas (500/1.000/2.000, Black ilimitado). Só o que passar paga R$ 0,10 por venda aprovada. Pendente, reembolso, cancelamento e chargeback não geram cobrança." },
  { q: "Posso cancelar quando quiser?", a: "Sim. Sem multa, sem burocracia. Seus dados de eventos e pedidos continuam auditáveis." },
  { q: "Meus dados estão seguros?", a: "Tokens cifrados com AES-GCM, webhooks autenticados por Bearer e payload guardado pra auditoria. Nada de dado espalhado." },
  { q: "Serve pra afiliado e agência?", a: "Sim. Projetos separados por operação, atribuição por campanha e rankings pra acompanhar performance de cada frente." },
  { q: "Existe suporte?", a: "Sim. Documentação pública em /docs, FAQ e canal de suporte pra dúvidas de operação e integração." },
];

export function LandingPage() {
  const scrolled = useScrolled();
  useReveal();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-clip bg-[#080b12] text-slate-100">
      {/* NAV */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-200 ${
          scrolled ? "border-b border-white/10 bg-[#080b12]/90 backdrop-blur-md" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-5">
          <a href="#home" className="flex min-w-0 items-center gap-2.5" aria-label="GhostScale início">
            <img
              src="/ghostscale-logo.png"
              alt="Logo GhostScale"
              width={220}
              height={44}
              decoding="async"
              className="h-9 w-auto max-w-[160px] object-contain sm:h-11 sm:max-w-[220px]"
            />
          </a>
          <nav className="hidden items-center gap-7 text-sm text-slate-400 md:flex">
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
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white sm:px-4"
            >
              Entrar
            </a>
            <a
              href="/login?modo=register"
              className="hidden items-center gap-2 rounded-xl bg-[#ff0030] px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-[#d60029] sm:inline-flex"
            >
              Criar conta grátis
              <ArrowRight className="size-4" strokeWidth={2.75} />
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section id="home" className="relative w-full max-w-full overflow-x-clip pt-32 pb-10 sm:pt-36">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(900px 420px at 50% 0%, #ff003022, transparent 60%), radial-gradient(700px 500px at 85% 80%, #755cff1e, transparent 60%)",
          }}
        />
        <div className="relative mx-auto w-full max-w-6xl min-w-0 px-4 text-center sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Quem fatura com tráfego já rastreia cada venda
          </p>
          <h1 className="mx-auto mt-4 w-full max-w-3xl min-h-[2.7em] text-4xl font-bold break-words leading-[1.08] tracking-tight sm:min-h-[2.2em] sm:text-6xl">
            Saiba exatamente qual anúncio coloca <HeroHeadline />
          </h1>
          <p className="mx-auto mt-5 w-full max-w-2xl text-[15px] leading-relaxed text-slate-400 sm:text-lg">
            O GhostScale une Pixel + Conversions API deduplicados, webhook universal de vendas e ROAS por campanha —
            <b className="text-slate-200"> sem depender de pixel cego e sem medo de clone.</b>
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <ArrowCta href="/login?modo=register">Criar conta grátis</ArrowCta>
            <ArrowCta href="#simulador" variant="ghost">
              Simular minha operação
            </ArrowCta>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs text-slate-500">
            {["Sem cartão de crédito", "Setup em 5 minutos", "100% seguro"].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <Check className="size-3.5 shrink-0 text-emerald-400" /> {t}
              </span>
            ))}
          </div>

          {/* mock do painel */}
          <div className="reveal relative mx-auto mt-12 w-full max-w-4xl min-w-0 rounded-2xl border border-white/10 bg-[#0b0e17] p-4 text-left sm:p-5">
            <div className="flex min-w-0 items-center gap-1.5 border-b border-white/10 pb-3">
              <span className="size-2.5 shrink-0 rounded-full bg-red-500/70" />
              <span className="size-2.5 shrink-0 rounded-full bg-amber-400/70" />
              <span className="size-2.5 shrink-0 rounded-full bg-emerald-400/70" />
              <span className="ml-3 truncate text-xs text-slate-500">painel.ghostscale — tempo real</span>
              <span className="ml-auto hidden shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] whitespace-nowrap text-emerald-300 sm:inline-flex">
                <span className="size-1.5 rounded-full bg-emerald-400" /> ao vivo
              </span>
            </div>
            <div className="grid min-w-0 gap-3 pt-4 sm:grid-cols-3">
              {[
                ["Gasto Meta", "R$ 4.820", "12 campanhas ativas", "text-slate-100"],
                ["Vendas aprovadas", "312", "+18% vs. ontem", "text-emerald-300"],
                ["ROAS", "3,8x", "R$ 18,4k faturados", "text-[#ff3b5c]"],
              ].map(([label, value, sub, color]) => (
                <div key={label} className="min-w-0 rounded-xl border border-white/10 bg-white/[.03] p-4">
                  <small className="block truncate text-xs text-slate-500">{label}</small>
                  <b className={`mt-1 block truncate text-2xl tabular-nums ${color}`}>{value}</b>
                  <small className="block truncate text-[11px] text-slate-500">{sub}</small>
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
                  <span className="w-24 shrink-0 truncate text-slate-400 sm:w-44">{name}</span>
                  <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div className="bar-anim h-full rounded-full bg-gradient-to-r from-[#ff0030] to-[#ff7a5c]" style={{ width: w }} />
                  </div>
                  <b className="w-10 shrink-0 text-right tabular-nums text-slate-200">{roas}</b>
                </div>
              ))}
            </div>
          </div>
        </div>

        <SalesTicker />
      </section>

      {/* DORES */}
      <section id="dores" className="cv-auto mx-auto w-full max-w-6xl min-w-0 scroll-mt-20 px-4 py-16 sm:px-5">
        <Tag>Dores reais</Tag>
        <h2 className="reveal mt-3 max-w-2xl text-3xl font-bold tracking-tight break-words sm:text-4xl">
          O lucro some no caminho entre o clique e a venda.
        </h2>
        <p className="reveal mt-3 max-w-2xl text-[15px] text-slate-400">
          Se você se reconhece em qualquer item abaixo, seu rastreio atual está te custando dinheiro todo dia.
        </p>
        <div className="mt-8 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pains.map((p) => (
            <div
              key={p.title}
              className="reveal group min-w-0 rounded-2xl border border-white/10 bg-[#0b0e17] p-6 transition-colors duration-200 hover:border-red-500/40"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-red-500/10 text-red-400 transition-colors duration-200 group-hover:bg-[#ff0030] group-hover:text-white">
                <p.icon className="size-5" />
              </span>
              <b className="mt-4 block">{p.title}</b>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{p.desc}</p>
            </div>
          ))}
        </div>
        <div className="reveal mt-8">
          <ArrowCta href="#solucao">Ver como o GhostScale resolve</ArrowCta>
        </div>
      </section>

      {/* SOLUÇÃO */}
      <section id="solucao" className="cv-auto w-full scroll-mt-20 border-y border-white/10 bg-[#0b0e17]/60 py-16">
        <div className="mx-auto w-full max-w-6xl min-w-0 px-4 sm:px-5">
          <Tag>A solução</Tag>
          <h2 className="reveal mt-3 max-w-2xl text-3xl font-bold tracking-tight break-words sm:text-4xl">
            Um rastreio que fecha a conta do clique ao saque.
          </h2>
          <p className="reveal mt-3 max-w-2xl text-[15px] text-slate-400">
            Cada feature abaixo existe de verdade no painel — e funciona junta, não em 4 ferramentas separadas.
          </p>
          <div className="mt-8 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {solutions.map((s) => (
              <div
                key={s.title}
                className="reveal group min-w-0 rounded-2xl border border-white/10 bg-[#080b12] p-6 transition-colors duration-200 hover:border-[#ff0030]/40"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-[#ff0030]/10 text-[#ff3b5c] transition-colors duration-200 group-hover:bg-[#ff0030] group-hover:text-white">
                  <s.icon className="size-5" />
                </span>
                <b className="mt-4 block">{s.title}</b>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARATIVO */}
      <section id="diferencial" className="cv-auto mx-auto w-full max-w-4xl min-w-0 scroll-mt-20 px-4 py-16 sm:px-5">
        <Tag>O diferencial</Tag>
        <h2 className="reveal mt-3 text-3xl font-bold tracking-tight break-words sm:text-4xl">
          Por que não é só mais um sistema de tracking
        </h2>
        <div className="reveal mt-8 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="bg-white/[.03]">
                <th className="p-4 text-left font-medium normal-case tracking-normal">Funcionalidade</th>
                <th className="p-4 text-center font-semibold whitespace-nowrap text-[#ff3b5c]">GhostScale</th>
                <th className="p-4 text-center font-medium whitespace-nowrap text-slate-500">Trackers comuns</th>
              </tr>
            </thead>
            <tbody>
              {compareRows.map(([f, ok, other]) => (
                <tr key={f} className="border-t border-white/10">
                  <td className="p-4 text-slate-200">{f}</td>
                  <td className="p-4 text-center">
                    <span className="inline-grid size-7 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
                      <Check className="size-4" strokeWidth={3} />
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-slate-500">
                      <X className="size-4 shrink-0 text-slate-600" /> {other}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="reveal mt-8 text-center">
          <ArrowCta href="/login?modo=register">Experimente a diferença</ArrowCta>
        </div>
      </section>

      {/* SIMULADOR */}
      <section id="simulador" className="cv-auto w-full scroll-mt-20 border-y border-white/10 bg-[#0b0e17]/60 py-16">
        <div className="mx-auto w-full max-w-4xl min-w-0 px-4 sm:px-5">
          <Tag>Simulador de escala</Tag>
          <h2 className="reveal mt-3 text-3xl font-bold tracking-tight break-words sm:text-4xl">
            Veja quanto você pode recuperar com atribuição correta
          </h2>
          <p className="reveal mt-3 max-w-2xl text-[15px] text-slate-400">
            Venda sem origem vira otimização errada. Recupere a atribuição e o algoritmo volta a trabalhar pra você.
          </p>
          <ScaleSimulator />
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="cv-auto mx-auto w-full max-w-6xl min-w-0 scroll-mt-20 px-4 py-16 sm:px-5">
        <Tag>Como funciona</Tag>
        <h2 className="reveal mt-3 text-3xl font-bold tracking-tight break-words sm:text-4xl">Do clique ao ROAS em 3 passos</h2>
        <div className="mt-8 grid min-w-0 gap-4 lg:grid-cols-3">
          {[
            { n: "01", t: "Crie seu projeto", d: "Cadastre o domínio e cole o script de tracking. Leva menos de 5 minutos, sem programador.", code: '<script src="https://seu-app/tracker.js?key=SUA_KEY"></script>' },
            { n: "02", t: "Conecte tudo", d: "Pixel + CAPI na Meta e webhook no checkout. Cada venda passa a chegar com origem completa.", code: "POST /api/webhooks/gateway  →  { received: true }" },
            { n: "03", t: "Ative e escale", d: "Acompanhe vendas em tempo real, receba alertas e escale a campanha que prova lucro.", code: "ROAS por campanha, todo dia, sem planilha" },
          ].map((s) => (
            <div key={s.n} className="reveal group min-w-0 rounded-2xl border border-white/10 bg-[#0b0e17] p-6 transition-colors duration-200 hover:border-[#ff0030]/40">
              <b className="bg-gradient-to-r from-[#ff0030] to-[#ff7a5c] bg-clip-text text-4xl font-bold text-transparent">{s.n}</b>
              <b className="mt-3 block text-lg">{s.t}</b>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{s.d}</p>
              <code className="mt-4 block w-full max-w-full overflow-x-auto rounded-xl border border-white/10 bg-black/50 p-3 text-[11px] leading-relaxed break-all text-emerald-300">
                {s.code}
              </code>
            </div>
          ))}
        </div>
        <div className="reveal mt-8 flex flex-wrap gap-3">
          <ArrowCta href="/login?modo=register">Começar agora — é grátis</ArrowCta>
          <ArrowCta href="/docs" variant="ghost">
            <span className="inline-flex items-center gap-2"><BookOpen className="size-4 shrink-0" /> Ler documentação</span>
          </ArrowCta>
        </div>
      </section>

      {/* PREÇOS */}
      <section id="precos" className="cv-auto w-full scroll-mt-20 border-y border-white/10 bg-[#0b0e17]/60 py-16">
        <div className="mx-auto w-full max-w-6xl min-w-0 px-4 text-center sm:px-5">
          <Tag>Preço transparente</Tag>
          <h2 className="reveal mx-auto mt-3 max-w-xl text-3xl font-bold tracking-tight break-words sm:text-4xl">
            4 planos. Sem letra miúda.
          </h2>
          <p className="reveal mx-auto mt-3 max-w-xl text-[15px] text-slate-400">
            Base fixa + R$ 0,10 só no excedente. Arraste e veja qual fecha mais barato pro seu volume.
          </p>
          <PriceCalculator />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="cv-auto mx-auto w-full max-w-3xl min-w-0 scroll-mt-20 px-4 py-16 sm:px-5">
        <Tag>Perguntas frequentes</Tag>
        <h2 className="reveal mt-3 text-3xl font-bold tracking-tight break-words sm:text-4xl">Tire suas dúvidas</h2>
        <div className="mt-8 min-w-0 space-y-3">
          {faqs.map((f, i) => {
            const open = openFaq === i;
            return (
              <div
                key={f.q}
                className={`reveal min-w-0 overflow-hidden rounded-2xl border transition-colors duration-200 ${
                  open ? "border-[#ff0030]/35 bg-[#ff0030]/[.04]" : "border-white/10 bg-[#0b0e17] hover:border-white/25"
                }`}
              >
                <button
                  onClick={() => setOpenFaq(open ? null : i)}
                  aria-expanded={open}
                  className="flex w-full min-w-0 items-center justify-between gap-4 p-5 text-left font-medium"
                >
                  <span className="min-w-0 flex-1">{f.q}</span>
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-full transition-transform duration-200 ${
                      open ? "rotate-180 bg-[#ff0030] text-white" : "bg-white/5 text-slate-400"
                    }`}
                  >
                    <ChevronDown className="size-4" />
                  </span>
                </button>
                <div
                  className={`grid transition-all duration-200 ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm leading-relaxed text-slate-400">{f.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="cv-auto mx-auto w-full max-w-6xl min-w-0 px-4 pb-16 sm:px-5">
        <div className="reveal relative min-w-0 overflow-hidden rounded-3xl bg-gradient-to-br from-[#ff0030] via-[#c40026] to-[#5c0013] p-8 text-center sm:p-14">
          <MetricsRain />
          <div className="pointer-events-none absolute inset-0 opacity-25 [background:radial-gradient(600px_200px_at_50%_0%,#fff,transparent)]" aria-hidden />
          <h2 className="relative mx-auto max-w-2xl text-3xl font-bold tracking-tight break-words text-white sm:text-5xl">
            Pronto pra parar de perder venda e escalar no dado?
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-[15px] text-white/80">
            Teste sem compromisso. Só continua quem vê resultado — e resultado aqui aparece no primeiro dia.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <ArrowCta href="/login?modo=register" variant="light">
              Criar conta grátis agora
            </ArrowCta>
            <a
              href="/docs"
              className="inline-flex max-w-full items-center gap-3 rounded-2xl border border-white/30 px-6 py-4 text-[15px] font-semibold whitespace-nowrap text-white transition-colors duration-200 hover:bg-white/10 active:scale-[.98]"
            >
              Falar com especialista
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/20">
                <ArrowRight className="size-4" strokeWidth={2.75} />
              </span>
            </a>
          </div>
          <p className="relative mt-5 text-xs text-white/60">Sem cartão • Setup em 5 min • 100% seguro</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="w-full border-t border-white/10 py-10">
        <div className="mx-auto grid w-full max-w-6xl min-w-0 gap-8 px-4 sm:px-5 sm:grid-cols-2 md:grid-cols-[1.2fr_.8fr_.8fr_.8fr]">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2.5">
              <img
                src="/ghostscale-logo.png"
                alt="Logo GhostScale"
                width={220}
                height={44}
                loading="lazy"
                decoding="async"
                className="h-9 w-auto max-w-[160px] object-contain sm:h-11 sm:max-w-[220px]"
              />
            </div>
            <p className="mt-3 max-w-xs text-sm text-slate-500">Mais que tracking: a arma secreta de quem vive de tráfego pago.</p>
          </div>
          {[
            ["Produto", [["Dores", "#dores"], ["Solução", "#solucao"], ["Simulador", "#simulador"], ["Preços", "#precos"], ["FAQ", "#faq"]]],
            ["Painel", [["Entrar", "/login"], ["Documentação", "/docs"], ["Guia gateways", "/docs/gateways"]]],
            ["Integrações", [["FortPay", "/docs/gateways"], ["Hotmart", "/docs/gateways"], ["Kiwify", "/docs/gateways"], ["Braip", "/docs/gateways"]]],
          ].map(([title, links]) => (
            <div key={title as string} className="min-w-0">
              <b className="text-sm">{title}</b>
              <ul className="mt-3 space-y-2 text-sm text-slate-500">
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
        <p className="mx-auto mt-8 w-full max-w-6xl px-4 text-xs text-slate-600 sm:px-5">© 2026 GhostScale. Todos os direitos reservados.</p>
      </footer>
    </main>
  );
}
