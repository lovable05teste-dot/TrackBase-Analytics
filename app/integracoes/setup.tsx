"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Check, ChevronDown, Code2, Copy, Megaphone, PlugZap, Radio, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetaAccountsClient } from "../contas-meta/accounts-client";
import { TrackingInstall } from "./tracking-install";
import { GatewayConnect, PixelConnect } from "./connections";
import { copyText } from "@/lib/clipboard";

export type SetupStatus = {
  projects: number;
  receivingVisits: boolean;
  metaLogins: number;
  metaLinked: number;
  pixelConnected: boolean;
  gateways: number;
  sales: number;
  utmVisits: boolean;
};

type State = "done" | "progress" | "todo";
type Step = { id: string; title: string; summary: string; icon: React.ComponentType<{ className?: string }>; state: State; hint: string; body: React.ReactNode };

const metaUtm = "utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}|{{campaign.id}}&utm_content={{ad.name}}|{{ad.id}}&utm_term={{adset.name}}|{{adset.id}}&placement={{placement}}&site_source_name={{site_source_name}}";

// Âncoras antigas (#ads, #pixel...) continuam funcionando: links de outras
// páginas, e-mails e da documentação abrem direto na etapa certa.
const HASH_TO_STEP: Record<string, string> = { projeto: "script", script: "script", ads: "meta", meta: "meta", pixel: "pixel", gateways: "gateway", gateway: "gateway", utms: "utms" };

const BADGE: Record<State, { label: string; className: string }> = {
  done: { label: "Concluído", className: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  progress: { label: "Em andamento", className: "border-amber-300 bg-amber-50 text-amber-700" },
  todo: { label: "Pendente", className: "border-slate-200 bg-slate-50 text-slate-500" },
};

function UtmStep() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (await copyText(metaUtm)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };
  return (
    <div className="space-y-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm leading-6 text-slate-600">
        <li>No Gerenciador de Anúncios, abra o <b>anúncio</b> (não a campanha).</li>
        <li>Em <b>Rastreamento → Parâmetros de URL</b>, cole o texto abaixo.</li>
        <li>Publique. A Meta preenche campanha, conjunto e anúncio sozinha.</li>
      </ol>
      <code className="block break-all rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-blue-600 sm:text-sm">{metaUtm}</code>
      <Button onClick={copy} className="h-11 w-full sm:w-auto">{copied ? <><Check />Copiado</> : <><Copy />Copiar parâmetros</>}</Button>
      <p className="text-xs leading-5 text-slate-500">
        Precisa de UTMs para outra origem (TikTok, Google, e-mail)? Use o <Link href="/ferramentas/utm-builder" className="font-medium text-blue-600 underline">UTM Builder</Link>.
      </p>
    </div>
  );
}

export default function IntegrationSetup({ status }: { status: SetupStatus }) {
  const steps: Step[] = [
    {
      id: "script",
      title: "Instalar o script na sua página",
      summary: "Crie o projeto e cole uma linha de código no site. É o que registra visitas e UTMs.",
      icon: Code2,
      state: status.receivingVisits ? "done" : status.projects ? "progress" : "todo",
      hint: status.receivingVisits ? "Recebendo visitas" : status.projects ? "Aguardando a primeira visita" : "Nenhum projeto criado",
      body: <TrackingInstall />,
    },
    {
      id: "meta",
      title: "Conectar sua conta de anúncios Meta",
      summary: "Entre com o Facebook e vincule a conta de anúncios para ver gastos e campanhas.",
      icon: Megaphone,
      state: status.metaLinked ? "done" : status.metaLogins ? "progress" : "todo",
      hint: status.metaLinked ? `${status.metaLinked} conta(s) vinculada(s)` : status.metaLogins ? "Vincule pelo menos uma conta" : "Nenhum login conectado",
      body: <MetaAccountsClient />,
    },
    {
      id: "pixel",
      title: "Conectar Pixel e API de Conversões",
      summary: "Envia os eventos para a Meta pelo navegador e pelo servidor, sem duplicar.",
      icon: Radio,
      state: status.pixelConnected ? "done" : "todo",
      hint: status.pixelConnected ? "Pixel ativo" : "Pixel não conectado",
      body: <PixelConnect />,
    },
    {
      id: "gateway",
      title: "Conectar o gateway de pagamento",
      summary: "Cole a URL de webhook no seu gateway para as vendas aparecerem no painel.",
      icon: PlugZap,
      state: status.sales ? "done" : status.gateways ? "progress" : "todo",
      hint: status.sales ? "Vendas chegando" : status.gateways ? "Aguardando a primeira venda" : "Nenhum gateway conectado",
      body: <GatewayConnect />,
    },
    {
      id: "utms",
      title: "Colocar as UTMs nos anúncios",
      summary: "Um texto pronto para colar no anúncio. Assim cada venda mostra de qual campanha veio.",
      icon: Tags,
      state: status.utmVisits ? "done" : "todo",
      hint: status.utmVisits ? "Visitas com UTM recebidas" : "Nenhuma visita com UTM ainda",
      body: <UtmStep />,
    },
  ];

  const done = steps.filter((s) => s.state === "done").length;
  const next = steps.find((s) => s.state !== "done");
  const [open, setOpen] = useState<string>(next?.id ?? "");

  useEffect(() => {
    const fromHash = () => {
      try {
        const target = HASH_TO_STEP[window.location.hash.replace("#", "")];
        if (target) {
          setOpen(target);
          requestAnimationFrame(() => document.getElementById(`etapa-${target}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
        }
      } catch {}
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  const toggle = (id: string) => {
    const value = open === id ? "" : id;
    setOpen(value);
    try {
      history.replaceState(null, "", `${location.pathname}${location.search}${value ? `#${value}` : ""}`);
    } catch {}
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-blue-600">Configuração</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
              {done === steps.length ? "Tudo pronto. Seu rastreamento está completo." : `${done} de ${steps.length} etapas concluídas`}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {next ? <>Próximo passo: <b className="text-slate-700">{next.title}</b>.</> : "Vendas, campanhas e eventos já estão chegando no painel."}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            {next && <Button className="h-11 w-full sm:w-auto" onClick={() => { setOpen(next.id); document.getElementById(`etapa-${next.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>Continuar configuração</Button>}
            <Link href="/docs" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-600 hover:text-blue-600"><BookOpen className="size-4" />Ver documentação</Link>
          </div>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done} aria-label="Progresso da configuração">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(done / steps.length) * 100}%` }} />
        </div>
      </section>

      <ol className="space-y-3">
        {steps.map((step, index) => {
          const expanded = open === step.id;
          const Icon = step.icon;
          const badge = BADGE[step.state];
          return (
            <li key={step.id} id={`etapa-${step.id}`} className={`scroll-mt-24 overflow-hidden rounded-2xl border bg-white shadow-sm transition ${expanded ? "border-blue-300 ring-2 ring-blue-500/10" : "border-slate-200"}`}>
              <button type="button" onClick={() => toggle(step.id)} aria-expanded={expanded} aria-controls={`painel-${step.id}`} className="flex w-full items-center gap-4 p-4 text-left sm:p-5">
                <span className={`grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold ${step.state === "done" ? "bg-emerald-500 text-white" : expanded ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                  {step.state === "done" ? <Check className="size-5" /> : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <Icon className="hidden size-4 shrink-0 text-slate-400 sm:block" />
                    <b className="text-[15px] text-slate-900 sm:text-base">{step.title}</b>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}>{badge.label}</span>
                  </span>
                  <span className="mt-1 block text-sm leading-5 text-slate-500">{expanded ? step.summary : step.hint}</span>
                </span>
                <ChevronDown className={`size-5 shrink-0 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
              </button>
              {expanded && <div id={`painel-${step.id}`} className="border-t border-slate-200 p-4 sm:p-6">{step.body}</div>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
