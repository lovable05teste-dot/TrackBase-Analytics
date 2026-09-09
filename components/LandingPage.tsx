"use client";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  Crosshair,
  Flame,
  Gauge,
  MousePointerClick,
  ShieldCheck,
  Sparkles,
  Webhook,
  Zap,
} from "lucide-react";

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
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* Botão com a setinha que cresce e troca de cor no hover */
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
      ? "bg-[#ff0030] text-white shadow-[0_10px_40px_-8px_#ff003080] hover:bg-[#d60029] hover:shadow-[0_16px_60px_-8px_#ff0030aa]"
      : variant === "light"
        ? "bg-white text-[#0b0e17] hover:bg-red-50"
        : "border border-white/15 text-slate-200 hover:border-white/30 hover:bg-white/5";
  return (
    <a
      href={href}
      className={`group inline-flex items-center gap-3 rounded-2xl px-6 py-4 text-[15px] font-semibold transition-all duration-300 hover:-translate-y-0.5 ${styles}`}
    >
      {children}
      <span
        className={`grid size-8 shrink-0 place-items-center rounded-full transition-all duration-300 group-hover:scale-125 ${
          variant === "light"
            ? "bg-[#ff0030]/10 text-[#ff0030] group-hover:bg-[#ff0030] group-hover:text-white"
            : "bg-white/20 text-white group-hover:bg-white group-hover:text-[#ff0030]"
        }`}
      >
        <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:scale-110" />
      </span>
    </a>
  );
}

const benefits = [
  { icon: MousePointerClick, title: "Checkout de conversão máxima", desc: "Capture cada clique do anúncio até a compra, sem perder atribuição no caminho." },
  { icon: Crosshair, title: "Atribuição por campanha", desc: "UTMs, fbclid, fbp e fbc cruzados com o gasto da Meta. Saiba exatamente qual anúncio vendeu." },
  { icon: Zap, title: "CAPI + Pixel deduplicados", desc: "Browser e servidor enviam o mesmo event_id. A Meta descarta duplicados sozinha." },
  { icon: Webhook, title: "Webhook universal de vendas", desc: "FortPay, Hotmart, Kiwify, FlevoPay e Utmify no mesmo endpoint, sem plugin." },
  { icon: ShieldCheck, title: "Antifraude e anticlone", desc: "Blacklist de IP, detecção de tráfego inválido e proteção da sua página de vendas." },
  { icon: Sparkles, title: "Predict com IA", desc: "Projeção de faturamento e alertas de queda antes do ROAS derreter." },
];

const faqs = [
  { q: "Preciso trocar de gateway para usar?", a: "Não. O TrackBase recebe vendas de qualquer gateway via webhook universal. Você cria uma credencial por gateway no painel, cola a URL e o token na plataforma e pronto." },
  { q: "Como funciona a taxa de R$ 0,25?", a: "Simples: só existe cobrança sobre venda aprovada. Sem mensalidade, sem taxa escondida, sem fidelidade. Pendentes, reembolsos e cancelamentos não geram cobrança." },
  { q: "O rastreamento funciona com iOS e bloqueadores?", a: "Sim. Além do script no navegador, os eventos são reenviados via Conversions API (servidor) com o mesmo event_id, então a Meta recebe a conversão mesmo quando o browser bloqueia o Pixel." },
  { q: "Preciso de programador para instalar?", a: "Não. É uma tag script com a chave do projeto + configuração dos webhooks no gateway. O guia de integração leva poucos minutos e está em /docs." },
  { q: "Meus dados ficam presos na plataforma?", a: "Não. Eventos e pedidos ficam no seu banco, com payload de auditoria. Você pode exportar e auditar quando quiser." },
  { q: "Existe suporte?", a: "Sim. Documentação pública em /docs, FAQ e canal de suporte para dúvidas de operação e integração." },
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
              ["Benefícios", "#beneficios"],
              ["Como funciona", "#como-funciona"],
              ["Funcionalidades", "#funcionalidades"],
              ["Taxas", "#taxas"],
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
              Criar conta
              <ArrowRight className="size-4 transition-all duration-300 group-hover:translate-x-1 group-hover:scale-125" />
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section id="home" className="relative overflow-hidden pb-16 pt-32 sm:pt-36">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 420px at 50% 0%, #ff003022, transparent 60%), radial-gradient(700px 500px at 85% 80%, #755cff1e, transparent 60%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-5 text-center">
          <a
            href="#como-funciona"
            className="group inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-4 py-1.5 text-xs text-red-200 transition-colors hover:border-red-500/50"
          >
            <span className="inline-block size-1.5 animate-pulse rounded-full bg-red-500" />
            Novo: webhook universal + CAPI v25.0
            <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1 group-hover:scale-125" />
          </a>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
            Rastreamento feito para quem domina o <span className="text-[#ff3b5c]">tráfego.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-slate-400 sm:text-lg">
            Quando a operação entra em pressão, você precisa de um sistema que aguente pico de escala e troca de
            gateway <b className="text-slate-200">sem perder nenhuma venda nem o ROAS.</b>
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <ArrowCta href="/login">Criar conta agora</ArrowCta>
            <ArrowCta href="#como-funciona" variant="ghost">
              Ver como funciona
            </ArrowCta>
          </div>

          {/* mock do painel */}
          <div className="reveal relative mx-auto mt-14 max-w-4xl rounded-2xl border border-white/10 bg-[#0b0e17]/90 p-4 text-left shadow-[0_30px_120px_-20px_#000] sm:p-5">
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
            <div className="float-anim absolute -right-3 -top-5 hidden items-center gap-2 rounded-xl border border-emerald-400/25 bg-[#0b1410]/95 px-3.5 py-2.5 text-xs shadow-xl sm:flex">
              <span className="grid size-7 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
                <Check className="size-4" />
              </span>
              <span><b className="block text-emerald-200">Purchase aprovada</b><span className="text-slate-400">+R$ 297,00 via FortPay</span></span>
            </div>
          </div>

          {/* gateways */}
          <div className="mt-10 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
            <div className="marquee flex w-max items-center gap-10 text-sm font-semibold text-slate-500">
              {["FortPay", "Hotmart", "Kiwify", "FlevoPay", "Utmify", "Meta Ads", "TikTok Ads"].concat(["FortPay", "Hotmart", "Kiwify", "FlevoPay", "Utmify", "Meta Ads", "TikTok Ads"]).map((g, i) => (
                <span key={i} className="flex items-center gap-10">
                  {g} <Flame className="size-3.5 text-[#ff0030]/60" />
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section id="beneficios" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16">
        <small className="reveal text-xs font-semibold uppercase tracking-[0.2em] text-[#ff3b5c]">Benefícios TrackBase</small>
        <h2 className="reveal mt-3 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
          Confira os benefícios de rastrear com a TrackBase
        </h2>
        <p className="reveal mt-3 max-w-2xl text-[15px] text-slate-400">
          Receba de qualquer gateway, com atribuição correta e ROAS confiável. Velocidade, confiança e poder de decisão.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b, i) => (
            <div
              key={b.title}
              className="reveal group rounded-2xl border border-white/10 bg-[#0b0e17] p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-[#ff0030]/40 hover:shadow-[0_20px_60px_-16px_#ff003055]"
              style={{ transitionDelay: `${(i % 3) * 60}ms` }}
            >
              <span className="grid size-11 place-items-center rounded-xl bg-[#ff0030]/10 text-[#ff3b5c] transition-all duration-300 group-hover:scale-110 group-hover:bg-[#ff0030] group-hover:text-white">
                <b.icon className="size-5" />
              </span>
              <b className="mt-4 block">{b.title}</b>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="scroll-mt-20 border-y border-white/10 bg-[#0b0e17]/60 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <small className="reveal text-xs font-semibold uppercase tracking-[0.2em] text-[#ff3b5c]">Em 3 passos</small>
          <h2 className="reveal mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Do clique ao ROAS em minutos</h2>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {[
              { n: "01", t: "Instale o tracker", d: "Uma tag script na página de vendas captura clique, PageView, checkout e UTMs.", code: '<script src="https://seu-app/tracker.js?key=SUA_KEY"></script>' },
              { n: "02", t: "Conecte Pixel + CAPI", d: "Valide o Pixel e o token da Meta. Browser e servidor passam a enviar o mesmo event_id.", code: "POST /api/meta/connect  →  Pixel + CAPI ativos" },
              { n: "03", t: "Ligue o gateway", d: "Crie a credencial, cole URL + token no gateway e cada venda vira Purchase atribuída.", code: "POST /api/webhooks/gateway  →  { received: true }" },
            ].map((s) => (
              <div key={s.n} className="reveal group rounded-2xl border border-white/10 bg-[#080b12] p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-[#ff0030]/40">
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
            <ArrowCta href="/login">Começar agora</ArrowCta>
            <ArrowCta href="/docs" variant="ghost">
              <BookOpen className="size-4" /> Ler documentação
            </ArrowCta>
          </div>
        </div>
      </section>

      {/* FUNCIONALIDADES */}
      <section id="funcionalidades" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16">
        <small className="reveal text-xs font-semibold uppercase tracking-[0.2em] text-[#ff3b5c]">Funcionalidades</small>
        <h2 className="reveal mt-3 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
          Tudo que a operação precisa para escalar
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="reveal group rounded-2xl border border-white/10 bg-gradient-to-b from-[#ff0030]/10 to-transparent p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-[#ff0030]/40 md:col-span-2">
            <BarChart3 className="size-6 text-[#ff3b5c] transition-transform duration-300 group-hover:scale-125" />
            <b className="mt-4 block text-xl">Multi-gateway com máxima aprovação de dados</b>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-400">
              Quando um status muda — pendente, aprovado, reembolsado ou chargeback — o painel atualiza sozinho.
              Reenvios são idempotentes: sem venda duplicada, sem ROAS inflado.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {["Purchase", "PaymentPending", "Refund", "Chargeback", "PaymentCancelled"].map((e) => (
                <span key={e} className="rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-slate-300 transition-colors group-hover:border-[#ff0030]/30">
                  {e}
                </span>
              ))}
            </div>
          </div>
          <div className="reveal group rounded-2xl border border-white/10 bg-[#0b0e17] p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-[#ff0030]/40">
            <Gauge className="size-6 text-[#ff3b5c] transition-transform duration-300 group-hover:scale-125" />
            <b className="mt-4 block text-xl">Funil + Heatmaps</b>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Do AdClick ao Purchase: veja onde o tráfego quebra e otimize a página que mais recebe clique.
            </p>
          </div>
          <div className="reveal group rounded-2xl border border-white/10 bg-[#0b0e17] p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-[#ff0030]/40">
            <Sparkles className="size-6 text-[#ff3b5c] transition-transform duration-300 group-hover:scale-125" />
            <b className="mt-4 block text-xl">Predict com IA</b>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Projeção de faturamento por campanha e alerta de anomalia antes do prejuízo.
            </p>
          </div>
          <div className="reveal group rounded-2xl border border-white/10 bg-[#0b0e17] p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-[#ff0030]/40">
            <Crosshair className="size-6 text-[#ff3b5c] transition-transform duration-300 group-hover:scale-125" />
            <b className="mt-4 block text-xl">Relatórios de UTM</b>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              utm_source, campaign, medium, content e term agregados com receita e conversão.
            </p>
          </div>
          <div className="reveal group rounded-2xl border border-white/10 bg-[#0b0e17] p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-[#ff0030]/40">
            <ShieldCheck className="size-6 text-[#ff3b5c] transition-transform duration-300 group-hover:scale-125" />
            <b className="mt-4 block text-xl">Segurança nativa</b>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Tokens cifrados com AES-GCM, webhooks com Bearer e auditoria de payload.
            </p>
          </div>
        </div>
      </section>

      {/* TAXAS */}
      <section id="taxas" className="scroll-mt-20 border-y border-white/10 bg-[#0b0e17]/60 py-16">
        <div className="mx-auto max-w-6xl px-5 text-center">
          <small className="reveal text-xs font-semibold uppercase tracking-[0.2em] text-[#ff3b5c]">Taxas transparentes</small>
          <h2 className="reveal mx-auto mt-3 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
            Nada de taxa escondida. Pague só quando vender.
          </h2>
          <div className="reveal mx-auto mt-8 max-w-md rounded-3xl border border-[#ff0030]/30 bg-gradient-to-b from-[#ff0030]/10 to-transparent p-8 shadow-[0_24px_80px_-24px_#ff003066] transition-transform duration-300 hover:-translate-y-1.5">
            <small className="text-sm text-slate-400">Taxa única</small>
            <div className="mt-2 flex items-end justify-center gap-1">
              <b className="text-6xl font-bold tracking-tight">R$ 0,25</b>
            </div>
            <p className="mt-1 text-sm text-slate-400">por venda aprovada</p>
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
            <div className="mt-7">
              <ArrowCta href="/login">Criar conta agora</ArrowCta>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-5 py-16">
        <small className="reveal text-xs font-semibold uppercase tracking-[0.2em] text-[#ff3b5c]">Dúvidas frequentes</small>
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
            Venda sem limites. Meça tudo.
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-[15px] text-white/80">
            Instale o tracker hoje e amanhã você já sabe exatamente qual campanha dá lucro.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <ArrowCta href="/login" variant="light">
              Criar conta agora
            </ArrowCta>
            <a
              href="/docs"
              className="group inline-flex items-center gap-3 rounded-2xl border border-white/30 px-6 py-4 text-[15px] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10"
            >
              Falar com especialista
              <span className="grid size-8 place-items-center rounded-full bg-white/20 transition-all duration-300 group-hover:scale-125 group-hover:bg-white group-hover:text-[#ff0030]">
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:scale-110" />
              </span>
            </a>
          </div>
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
            <p className="mt-3 max-w-xs text-sm text-slate-500">Venda sem limites, meça tudo. Inteligência para Meta Ads.</p>
          </div>
          {[
            ["Produto", [["Benefícios", "#beneficios"], ["Funcionalidades", "#funcionalidades"], ["Taxas", "#taxas"], ["FAQ", "#faq"]]],
            ["Painel", [["Entrar", "/login"], ["Documentação", "/docs"], ["Guia gateways", "/docs/gateways"]]],
            ["Integrações", [["FortPay", "/docs/gateways"], ["Hotmart", "/docs/gateways"], ["Kiwify", "/docs/gateways"], ["Utmify", "/docs/gateways"]]],
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
