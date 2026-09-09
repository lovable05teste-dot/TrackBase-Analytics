"use client";
import { useEffect, useState, type ReactNode } from "react";
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

function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return scrolled;
}

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("reveal-visible")),
      { threshold: 0.1 }
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

/* Seta turbinada: a bolinha cresce, acende e a seta dispara pra frente */
function ArrowCta({
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
      ? "bg-[#ff0030] text-white shadow-[0_10px_40px_-8px_#ff003080] hover:bg-[#d60029] hover:shadow-[0_18px_70px_-8px_#ff0030bb]"
      : variant === "light"
        ? "bg-white text-[#0b0e17] hover:bg-red-50"
        : "border border-white/15 text-slate-200 hover:border-white/30 hover:bg-white/5";
  return (
    <a
      href={href}
      className={`group inline-flex items-center gap-3 rounded-2xl px-6 py-4 text-[15px] font-semibold transition-all duration-300 hover:-translate-y-1 active:translate-y-0 active:scale-[.98] ${styles}`}
    >
      {children}
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-full transition-all duration-300 group-hover:scale-[1.35] group-hover:shadow-[0_0_26px_rgba(255,255,255,.5)] ${
          variant === "light"
            ? "bg-[#ff0030]/10 text-[#ff0030] group-hover:bg-[#ff0030] group-hover:text-white group-hover:shadow-[0_0_26px_rgba(255,0,48,.65)]"
            : "bg-white/20 text-white group-hover:bg-white group-hover:text-[#ff0030]"
        }`}
      >
        <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:scale-125" strokeWidth={2.75} />
      </span>
    </a>
  );
}

/* Ticker de vendas passando — fita ao vivo em 2 trilhos */
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

function SalesTicker() {
  const row = (items: string[][], key: string, reverse: boolean) => (
    <div className="flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
      <div className={`flex w-max items-center gap-3 py-1.5 pr-3 ${reverse ? "marquee-reverse" : "marquee"}`}>
        {items.concat(items).map(([value, gateway, ago], i) => (
          <span
            key={`${key}-${i}`}
            className="inline-flex shrink-0 items-center gap-2.5 rounded-full border border-white/10 bg-[#0b0e17]/90 py-2 pl-3 pr-4 text-xs transition-colors hover:border-emerald-400/40"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            <b className="text-emerald-300">{value}</b>
            <span className="text-slate-400">{gateway}</span>
            <span className="text-slate-600">{ago}</span>
          </span>
        ))}
      </div>
    </div>
  );
  return (
    <div className="relative mt-12 space-y-3">
      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
        Vendas sendo rastreadas agora
      </p>
      {row(tickerSales, "sales", false)}
      <div className="flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <div className="marquee-reverse flex w-max items-center gap-3 py-1.5 pr-3">
          {tickerWins.concat(tickerWins).map((w, i) => (
            <span
              key={`win-${i}`}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#ff0030]/20 bg-[#ff0030]/[.06] px-4 py-2 text-xs text-slate-300 transition-colors hover:border-[#ff0030]/50"
            >
              <TrendingUp className="size-3.5 text-[#ff3b5c]" />
              {w}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Simulador de escala — o visitante brinca com os números */
function ScaleSimulator() {
  const [invest, setInvest] = useState(5000);
  const [sales, setSales] = useState(120);
  const [ticket, setTicket] = useState(97);
  const revenue = sales * ticket;
  const roas = invest > 0 ? revenue / invest : 0;
  const cpa = sales > 0 ? invest / sales : 0;
  const extra = revenue * 0.12;
  const num = (v: number, setter: (n: number) => void, label: string, prefix = "") => (
    <label className="block rounded-2xl border border-white/10 bg-black/40 p-4 transition-colors focus-within:border-[#ff0030]/50">
      <small className="text-xs text-slate-500">{label}</small>
      <span className="mt-1 flex items-center gap-1 text-2xl font-bold">
        {prefix && <span className="text-sm text-slate-500">{prefix}</span>}
        <input
          type="number"
          min={0}
          value={v}
          onChange={(e) => setter(Math.max(0, Number(e.target.value)))}
          className="w-full bg-transparent outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </span>
    </label>
  );
  return (
    <div className="reveal mt-8 grid gap-4 overflow-hidden rounded-3xl border border-white/10 bg-[#0b0e17] p-6 sm:p-8 lg:grid-cols-[1fr_1fr]">
      <div>
        <b className="flex items-center gap-2 text-lg"><Calculator className="size-5 text-[#ff3b5c]" /> Preencha os dados da sua operação</b>
        <p className="mt-1 text-sm text-slate-500">Arraste a realidade pra dentro e veja a projeção com atribuição correta.</p>
        <div className="mt-5 space-y-3">
          {num(invest, setInvest, "Investimento (últimos 7 dias)", "R$")}
          {num(sales, setSales, "Número de vendas")}
          {num(ticket, setTicket, "Ticket médio (R$)", "R$")}
        </div>
      </div>
      <div className="flex flex-col justify-center rounded-2xl border border-[#ff0030]/25 bg-gradient-to-b from-[#ff0030]/10 to-transparent p-6">
        <small className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Sua operação hoje</small>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          {[
            ["Faturamento", brl(revenue)],
            ["ROAS", `${roas.toFixed(2)}x`],
            ["CPA", brl(cpa)],
          ].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-black/40 p-3">
              <small className="block text-[11px] text-slate-500">{l}</small>
              <b className="text-lg">{v}</b>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-emerald-400/25 bg-emerald-400/[.07] p-4 text-center">
          <small className="text-xs text-emerald-300/80">Receita extra estimada recuperando 12% em atribuição</small>
          <b className="mt-1 block text-3xl text-emerald-300">+{brl(extra)}<span className="text-sm font-normal text-emerald-300/70">/semana</span></b>
        </div>
        <small className="mt-3 text-center text-[11px] text-slate-600">Simulação educativa. Resultados variam por operação.</small>
        <div className="mt-4 text-center"><ArrowCta href="/login">Quero esse rastreio</ArrowCta></div>
      </div>
    </div>
  );
}

/* Calculadora do preço — 1 slider, conta na hora */
function PriceCalculator() {
  const [sales, setSales] = useState(1200);
  return (
    <div className="reveal mx-auto mt-8 max-w-md rounded-3xl border border-[#ff0030]/30 bg-gradient-to-b from-[#ff0030]/10 to-transparent p-8 shadow-[0_24px_80px_-24px_#ff003066] transition-transform duration-300 hover:-translate-y-1.5">
      <small className="text-sm text-slate-400">Taxa única</small>
      <div className="mt-2 flex items-end justify-center gap-1">
        <b className="text-6xl font-bold tracking-tight">R$ 0,25</b>
      </div>
      <p className="mt-1 text-sm text-slate-400">por venda aprovada. Só isso.</p>
      <div className="mt-6 rounded-2xl bg-black/40 p-5 text-left">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Suas vendas/mês</span>
          <b className="text-lg">{sales.toLocaleString("pt-BR")}</b>
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
        <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
          <span className="text-sm text-slate-400">Sua conta fecha em</span>
          <b className="text-2xl text-emerald-300">{brl(sales * 0.25)}<span className="text-sm font-normal text-slate-500">/mês</span></b>
        </div>
      </div>
      <ul className="mx-auto mt-6 max-w-xs space-y-2.5 text-left text-sm">
        {["Sem mensalidade", "Só cobra em venda aprovada", "CAPI + Pixel incluídos", "Gateways ilimitados", "Cancele quando quiser"].map((f) => (
          <li key={f} className="flex items-center gap-2.5 text-slate-300">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
              <Check className="size-3" />
            </span>
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-7"><ArrowCta href="/login">Criar conta agora</ArrowCta></div>
    </div>
  );
}

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
  { icon: ShieldCheck, title: "Anti-clone + blacklist", desc: "Detecta cópias, barra IP suspeito e protege o checkout que você pagou pra aquecer." },
  { icon: BarChart3, title: "Funil + heatmaps", desc: "Veja onde o visitante desiste e o que ele realmente olha na sua página." },
  { icon: Sparkles, title: "Predict com IA", desc: "Projeção de faturamento e alerta de anomalia antes do prejuízo virar bola de neve." },
  { icon: BellRing, title: "Monitoramento 24/7", desc: "Site fora do ar? Você descobre em minutos, não depois de torrar a verba do dia." },
  { icon: Trophy, title: "Rankings + comunidade", desc: "Badges, níveis e troca com quem vive de tráfego todos os dias." },
];

const compareRows: [string, boolean, string][] = [
  ["Anti-clone de verdade", true, "Não tem"],
  ["CAPI com deduplicação automática", true, "Manual ou parcial"],
  ["Webhook universal multi-gateway", true, "Um plugin por checkout"],
  ["Preço por venda aprovada, sem mensalidade", true, "Mensalidade + excedentes"],
  ["Monitoramento de site 24/7", true, "Não tem"],
  ["Predict com IA + alertas", true, "Não tem"],
  ["Setup em 5 minutos, sem programar", true, "Precisa de dev"],
];

const faqs = [
  { q: "Preciso saber programar?", a: "Não. Você cola um script na página e configura o webhook no checkout seguindo o passo a passo em /docs. Em minutos está rastreando." },
  { q: "Funciona com o meu checkout?", a: "Se o seu gateway envia webhook, funciona. FortPay, Hotmart, Kiwify, Braip, Stripe, FlevoPay, Utmify e qualquer outro — o endpoint aceita qualquer formato e detecta os campos sozinho." },
  { q: "E se o pixel for bloqueado?", a: "É exatamente pra isso que existe o CAPI: o servidor reenvia cada evento com o mesmo event_id, então a conversão chega na Meta mesmo com iOS restrito ou bloqueador ativo." },
  { q: "Como funciona a taxa de R$ 0,25?", a: "Só existe cobrança sobre venda aprovada. Pendente, reembolso, cancelamento e chargeback não geram cobrança. Sem mensalidade e sem fidelidade." },
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
    <main className="min-h-screen bg-[#080b12] text-slate-100">
      {/* NAV */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled ? "border-b border-white/10 bg-[#080b12]/85 backdrop-blur-xl" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <a href="#home" className="flex items-center gap-2.5">
            <img src="/trackbase-logo.png" alt="Logo TrackBase Analytics" className="h-9 w-16 object-contain" />
            <b className="text-[15px]">TrackBase Analytics</b>
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
          <div className="flex items-center gap-2">
            <a
              href="/login"
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              Entrar
            </a>
            <a
              href="/login"
              className="group hidden items-center gap-2 rounded-xl bg-[#ff0030] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#d60029] hover:shadow-[0_12px_36px_-8px_#ff0030aa] sm:inline-flex"
            >
              Criar conta grátis
              <ArrowRight className="size-4 transition-all duration-300 group-hover:translate-x-1 group-hover:scale-150 group-hover:text-white" strokeWidth={2.75} />
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section id="home" className="relative overflow-hidden pb-10 pt-32 sm:pt-36">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 420px at 50% 0%, #ff003022, transparent 60%), radial-gradient(700px 500px at 85% 80%, #755cff1e, transparent 60%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Quem fatura com tráfego já rastreia cada venda
          </p>
          <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
            Saiba exatamente qual anúncio coloca <span className="text-[#ff3b5c]">dinheiro no seu bolso.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-slate-400 sm:text-lg">
            O TrackBase une Pixel + Conversions API deduplicados, webhook universal de vendas e ROAS por campanha —
            <b className="text-slate-200"> sem depender de pixel cego e sem medo de clone.</b>
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <ArrowCta href="/login">Criar conta grátis</ArrowCta>
            <ArrowCta href="#simulador" variant="ghost">
              Simular minha operação
            </ArrowCta>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs text-slate-500">
            {["Sem cartão de crédito", "Setup em 5 minutos", "100% seguro"].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-emerald-400" /> {t}
              </span>
            ))}
          </div>

          {/* mock do painel */}
          <div className="reveal relative mx-auto mt-12 max-w-4xl rounded-2xl border border-white/10 bg-[#0b0e17]/90 p-4 text-left shadow-[0_30px_120px_-20px_#000] sm:p-5">
            <div className="flex items-center gap-1.5 border-b border-white/10 pb-3">
              <span className="size-2.5 rounded-full bg-red-500/70" />
              <span className="size-2.5 rounded-full bg-amber-400/70" />
              <span className="size-2.5 rounded-full bg-emerald-400/70" />
              <span className="ml-3 text-xs text-slate-500">painel.trackbase — tempo real</span>
              <span className="ml-auto hidden items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300 sm:inline-flex">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" /> ao vivo
              </span>
            </div>
            <div className="grid gap-3 pt-4 sm:grid-cols-3">
              {[
                ["Gasto Meta", "R$ 4.820", "12 campanhas ativas", "text-slate-100"],
                ["Vendas aprovadas", "312", "+18% vs. ontem", "text-emerald-300"],
                ["ROAS", "3,8x", "R$ 18,4k faturados", "text-[#ff3b5c]"],
              ].map(([label, value, sub, color]) => (
                <div key={label} className="rounded-xl border border-white/10 bg-white/[.03] p-4">
                  <small className="text-xs text-slate-500">{label}</small>
                  <b className={`mt-1 block text-2xl ${color}`}>{value}</b>
                  <small className="text-[11px] text-slate-500">{sub}</small>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-2.5 rounded-xl border border-white/10 bg-white/[.02] p-4">
              {[
                ["campanha-escala|2384729384", "92%", "3,8x"],
                ["oferta-inverno|2384729102", "64%", "2,9x"],
                ["teste-criativo-c|2384729555", "38%", "1,7x"],
              ].map(([name, w, roas]) => (
                <div key={name} className="flex items-center gap-3 text-xs">
                  <span className="w-44 truncate text-slate-400">{name}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div className="bar-anim h-full rounded-full bg-gradient-to-r from-[#ff0030] to-[#ff7a5c]" style={{ width: w }} />
                  </div>
                  <b className="w-10 text-right text-slate-200">{roas}</b>
                </div>
              ))}
            </div>
          </div>
        </div>

        <SalesTicker />
      </section>

      {/* DORES */}
      <section id="dores" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16">
        <Tag>Dores reais</Tag>
        <h2 className="reveal mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          O lucro some no caminho entre o clique e a venda.
        </h2>
        <p className="reveal mt-3 max-w-2xl text-[15px] text-slate-400">
          Se você se reconhece em qualquer item abaixo, seu rastreio atual está te custando dinheiro todo dia.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pains.map((p, i) => (
            <div
              key={p.title}
              className="reveal group rounded-2xl border border-white/10 bg-[#0b0e17] p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-red-500/40 hover:shadow-[0_20px_60px_-16px_#ff003055]"
              style={{ transitionDelay: `${(i % 3) * 60}ms` }}
            >
              <span className="grid size-11 place-items-center rounded-xl bg-red-500/10 text-red-400 transition-all duration-300 group-hover:scale-110 group-hover:bg-[#ff0030] group-hover:text-white">
                <p.icon className="size-5" />
              </span>
              <b className="mt-4 block">{p.title}</b>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{p.desc}</p>
            </div>
          ))}
        </div>
        <div className="reveal mt-8">
          <ArrowCta href="#solucao">Ver como o TrackBase resolve</ArrowCta>
        </div>
      </section>

      {/* SOLUÇÃO */}
      <section id="solucao" className="scroll-mt-20 border-y border-white/10 bg-[#0b0e17]/60 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <Tag>A solução</Tag>
          <h2 className="reveal mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            Um rastreio que fecha a conta do clique ao saque.
          </h2>
          <p className="reveal mt-3 max-w-2xl text-[15px] text-slate-400">
            Cada feature abaixo existe de verdade no painel — e funciona junta, não em 4 ferramentas separadas.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {solutions.map((s, i) => (
              <div
                key={s.title}
                className="reveal group rounded-2xl border border-white/10 bg-[#080b12] p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-[#ff0030]/40 hover:shadow-[0_20px_60px_-16px_#ff003055]"
                style={{ transitionDelay: `${(i % 3) * 60}ms` }}
              >
                <span className="grid size-11 place-items-center rounded-xl bg-[#ff0030]/10 text-[#ff3b5c] transition-all duration-300 group-hover:scale-110 group-hover:bg-[#ff0030] group-hover:text-white">
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
      <section id="diferencial" className="mx-auto max-w-4xl scroll-mt-20 px-5 py-16">
        <Tag>O diferencial</Tag>
        <h2 className="reveal mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Por que não é só mais um sistema de tracking
        </h2>
        <div className="reveal mt-8 overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[.03]">
                <th className="p-4 text-left font-medium normal-case tracking-normal">Funcionalidade</th>
                <th className="p-4 text-center font-semibold text-[#ff3b5c]">TrackBase</th>
                <th className="p-4 text-center font-medium text-slate-500">Trackers comuns</th>
              </tr>
            </thead>
            <tbody>
              {compareRows.map(([f, ok, other]) => (
                <tr key={f} className="border-t border-white/10 transition-colors hover:bg-white/[.02]">
                  <td className="p-4 text-slate-200">{f}</td>
                  <td className="p-4 text-center">
                    <span className="inline-grid size-7 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
                      <Check className="size-4" strokeWidth={3} />
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center justify-center gap-1.5 text-slate-500">
                      <X className="size-4 text-slate-600" /> {other}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="reveal mt-8 text-center">
          <ArrowCta href="/login">Experimente a diferença</ArrowCta>
        </div>
      </section>

      {/* SIMULADOR */}
      <section id="simulador" className="scroll-mt-20 border-y border-white/10 bg-[#0b0e17]/60 py-16">
        <div className="mx-auto max-w-4xl px-5">
          <Tag>Simulador de escala</Tag>
          <h2 className="reveal mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Veja quanto você pode recuperar com atribuição correta
          </h2>
          <p className="reveal mt-3 max-w-2xl text-[15px] text-slate-400">
            Venda sem origem vira otimização errada. Recupere a atribuição e o algoritmo volta a trabalhar pra você.
          </p>
          <ScaleSimulator />
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16">
        <Tag>Como funciona</Tag>
        <h2 className="reveal mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Do clique ao ROAS em 3 passos</h2>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {[
            { n: "01", t: "Crie seu projeto", d: "Cadastre o domínio e cole o script de tracking. Leva menos de 5 minutos, sem programador.", code: '<script src="https://seu-app/tracker.js?key=SUA_KEY"></script>' },
            { n: "02", t: "Conecte tudo", d: "Pixel + CAPI na Meta e webhook no checkout. Cada venda passa a chegar com origem completa.", code: "POST /api/webhooks/gateway  →  { received: true }" },
            { n: "03", t: "Ative e escale", d: "Acompanhe vendas em tempo real, receba alertas e escale a campanha que prova lucro.", code: "ROAS por campanha, todo dia, sem planilha" },
          ].map((s) => (
            <div key={s.n} className="reveal group rounded-2xl border border-white/10 bg-[#0b0e17] p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-[#ff0030]/40">
              <b className="bg-gradient-to-r from-[#ff0030] to-[#ff7a5c] bg-clip-text text-4xl font-bold text-transparent">{s.n}</b>
              <b className="mt-3 block text-lg">{s.t}</b>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{s.d}</p>
              <code className="mt-4 block overflow-x-auto rounded-xl border border-white/10 bg-black/50 p-3 text-[11px] leading-relaxed text-emerald-300 transition-colors group-hover:border-emerald-400/20">
                {s.code}
              </code>
            </div>
          ))}
        </div>
        <div className="reveal mt-8 flex flex-wrap gap-3">
          <ArrowCta href="/login">Começar agora — é grátis</ArrowCta>
          <ArrowCta href="/docs" variant="ghost">
            <BookOpen className="size-4" /> Ler documentação
          </ArrowCta>
        </div>
      </section>

      {/* PREÇOS */}
      <section id="precos" className="scroll-mt-20 border-y border-white/10 bg-[#0b0e17]/60 py-16">
        <div className="mx-auto max-w-6xl px-5 text-center">
          <Tag>Preço transparente</Tag>
          <h2 className="reveal mx-auto mt-3 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
            Um preço só. Sem plano confuso.
          </h2>
          <p className="reveal mx-auto mt-3 max-w-xl text-[15px] text-slate-400">
            Enquanto outros cobram mensalidade + excedente + add-on, aqui a conta cabe num post-it: vendeu, pagou. Não vendeu, não pagou.
          </p>
          <PriceCalculator />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-5 py-16">
        <Tag>Perguntas frequentes</Tag>
        <h2 className="reveal mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Tire suas dúvidas</h2>
        <div className="mt-8 space-y-3">
          {faqs.map((f, i) => {
            const open = openFaq === i;
            return (
              <div
                key={f.q}
                className={`reveal overflow-hidden rounded-2xl border transition-colors duration-300 ${
                  open ? "border-[#ff0030]/35 bg-[#ff0030]/[.04]" : "border-white/10 bg-[#0b0e17] hover:border-white/25"
                }`}
              >
                <button
                  onClick={() => setOpenFaq(open ? null : i)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left font-medium"
                >
                  {f.q}
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-full transition-all duration-300 ${
                      open ? "rotate-180 bg-[#ff0030] text-white" : "bg-white/5 text-slate-400"
                    }`}
                  >
                    <ChevronDown className="size-4" />
                  </span>
                </button>
                <div
                  className={`grid transition-all duration-300 ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
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
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="reveal relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#ff0030] via-[#c40026] to-[#5c0013] p-10 text-center sm:p-14">
          <div className="pointer-events-none absolute inset-0 opacity-25 [background:radial-gradient(600px_200px_at_50%_0%,#fff,transparent)]" />
          <h2 className="relative mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-5xl">
            Pronto pra parar de perder venda e escalar no dado?
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-[15px] text-white/80">
            Teste sem compromisso. Só continua quem vê resultado — e resultado aqui aparece no primeiro dia.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <ArrowCta href="/login" variant="light">
              Criar conta grátis agora
            </ArrowCta>
            <a
              href="/docs"
              className="group inline-flex items-center gap-3 rounded-2xl border border-white/30 px-6 py-4 text-[15px] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10 active:translate-y-0 active:scale-[.98]"
            >
              Falar com especialista
              <span className="grid size-9 place-items-center rounded-full bg-white/20 transition-all duration-300 group-hover:scale-[1.35] group-hover:bg-white group-hover:text-[#ff0030] group-hover:shadow-[0_0_26px_rgba(255,255,255,.5)]">
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:scale-125" strokeWidth={2.75} />
              </span>
            </a>
          </div>
          <p className="relative mt-5 text-xs text-white/60">Sem cartão • Setup em 5 min • 100% seguro</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 md:grid-cols-[1.2fr_.8fr_.8fr_.8fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <img src="/trackbase-logo.png" alt="Logo TrackBase Analytics" className="h-9 w-16 object-contain" />
              <b className="text-[15px]">TrackBase Analytics</b>
            </div>
            <p className="mt-3 max-w-xs text-sm text-slate-500">Mais que tracking: a arma secreta de quem vive de tráfego pago.</p>
          </div>
          {[
            ["Produto", [["Dores", "#dores"], ["Solução", "#solucao"], ["Simulador", "#simulador"], ["Preços", "#precos"], ["FAQ", "#faq"]]],
            ["Painel", [["Entrar", "/login"], ["Documentação", "/docs"], ["Guia gateways", "/docs/gateways"]]],
            ["Integrações", [["FortPay", "/docs/gateways"], ["Hotmart", "/docs/gateways"], ["Kiwify", "/docs/gateways"], ["Braip", "/docs/gateways"]]],
          ].map(([title, links]) => (
            <div key={title as string}>
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
        <p className="mx-auto mt-8 max-w-6xl px-5 text-xs text-slate-600">© 2026 TrackBase Analytics. Todos os direitos reservados.</p>
      </footer>
    </main>
  );
}
