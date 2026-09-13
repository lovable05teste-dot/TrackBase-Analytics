"use client";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Check, Loader2, Lock, ShieldCheck, X, AlertCircle, Ban } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { formatCpf, stripCpf, validateCpf } from "@/lib/cpf";

type Plan = { id: string; name: string; price: number; priceLabel: string; sales: number | null; feats: string[]; hot?: boolean; configured: boolean };
type Subscription = { plan: string; status: string; amount: string | null; currentPeriodEnd: number | null } | null;

declare global {
  interface Window {
    Cakto?: { CaktoSDK: new (opts: { client_id: string }) => CaktoSdk };
  }
}
type CaktoSdk = {
  initAntifraud(): Promise<void>;
  completeAntifraudProfile(): Promise<void>;
  getAntifraudReference(): string;
  createToken(card: { holderName: string; cardNumber: string; cvv: string; expMonth: string; expYear: string }): Promise<{ cardToken: string }>;
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function luhn(num: string) {
  const d = num.replace(/\D/g, "");
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0;
  let dbl = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (dbl) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

function formatCard(num: string) {
  return num.replace(/\D/g, "").slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExp(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

function validExp(v: string) {
  const m = v.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
  if (!m) return false;
  const exp = new Date(2000 + Number(m[2]), Number(m[1]), 1);
  return exp.getTime() > Date.now();
}

const statusLabel: Record<string, string> = {
  active: "Ativa",
  past_due: "Pagamento pendente",
  paused: "Pausada",
  canceled: "Cancelada",
  demo: "Modo demonstração",
  inactive: "Sem plano",
};

export function AssinaturaClient() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sub, setSub] = useState<Subscription>(null);
  const [sdkOk, setSdkOk] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalPlan, setModalPlan] = useState<Plan | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [payOk, setPayOk] = useState(false);
  const [sdk, setSdk] = useState<CaktoSdk | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [card, setCard] = useState("");
  const [holder, setHolder] = useState("");
  const [exp, setExp] = useState("");
  const [cvv, setCvv] = useState("");
  const [installments, setInstallments] = useState(1);
  const [payMethod, setPayMethod] = useState<"card" | "pix">("card");
  const [pixData, setPixData] = useState<{ qrCode: string; expirationDate: string | null; checkoutUrl: string | null } | null>(null);

  const [loadError, setLoadError] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);

  async function load() {
    try {
      const r = await fetch("/api/billing/cakto/status");
      const b = await r.json();
      if (!r.ok) throw new Error(b.error || "Falha ao carregar assinatura.");
      setPlans(b.plans || []);
      setSub(b.subscription || null);
      setSdkOk(!!b.sdkClientId);
      setLoadError("");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Falha ao carregar. Verifique sua conexão e recarregue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Busca inicial ao montar (load também é reusado em botões/retry).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  useEffect(() => {
    if (!modalPlan || sdk) return;
    const clientId = (process.env.NEXT_PUBLIC_CAKTO_CLIENT_ID || "").trim();
    if (!clientId) return;
    const script = document.createElement("script");
    script.src = "https://cakto-sdk.pages.dev/cakto-sdk.min.js";
    script.async = true;
    script.onload = () => {
      try {
        const instance = new window.Cakto!.CaktoSDK({ client_id: clientId });
        setSdk(instance);
        instance.initAntifraud().catch(() => {});
      } catch {
        /* sem antifraude */
      }
    };
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, [modalPlan, sdk]);

  function openCheckout(plan: Plan) {
    setPayError("");
    setPayOk(false);
    setPixData(null);
    setPayMethod("card");
    setInstallments(1);
    setModalPlan(plan);
  }

  function validCustomer() {
    const phoneDigits = phone.replace(/\D/g, "");
    const phoneE164 = phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`;
    if (name.trim().length < 3) return "Informe seu nome completo.";
    if (!/.+@.+\..+/.test(email.trim())) return "Informe um e-mail válido.";
    if (!validateCpf(cpf)) return "Confira o CPF.";
    if (phoneE164.length < 12 || phoneE164.length > 13) return "Informe o celular com DDD (10 ou 11 dígitos).";
    return "";
  }

  async function pay(e: FormEvent) {
    e.preventDefault();
    if (!modalPlan) return;
    setPayError("");
    const digits = card.replace(/\D/g, "");
    if (name.trim().length < 3) return setPayError("Informe seu nome completo.");
    if (!/.+@.+\..+/.test(email.trim())) return setPayError("Informe um e-mail válido.");
    if (!validateCpf(cpf)) return setPayError("Confira o CPF.");
    const phoneDigits = phone.replace(/\D/g, "");
    const phoneE164 = phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`;
    if (phoneE164.length < 12 || phoneE164.length > 13) return setPayError("Informe o celular com DDD (10 ou 11 dígitos).");
    if (!luhn(digits)) return setPayError("Número do cartão inválido.");
    if (holder.trim().length < 3) return setPayError("Informe o nome impresso no cartão.");
    if (!validExp(exp)) return setPayError("Validade inválida ou vencida.");
    if (!/^\d{3,4}$/.test(cvv.trim())) return setPayError("Confira o CVV.");
    if (!sdk) return setPayError("Checkout ainda carregando. Aguarde 5 segundos e tente de novo.");
    setPaying(true);
    try {
      await sdk.completeAntifraudProfile();
      const reference = sdk.getAntifraudReference();
      if (!reference) throw new Error("Falha no antifraude. Recarregue a página e tente de novo.");
      const [mm, yy] = exp.split("/");
      const { cardToken } = await sdk.createToken({
        holderName: holder.trim(),
        cardNumber: digits,
        cvv: cvv.trim(),
        expMonth: mm,
        expYear: yy,
      });
      const r = await fetch("/api/billing/cakto/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          plan: modalPlan.id,
          method: "card",
          cardToken,
          antifraudReference: reference,
          installments,
          customer: { name: name.trim(), email: email.trim(), phone: phoneE164, docType: "cpf", docNumber: stripCpf(cpf) },
        }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error || "Pagamento não aprovado.");
      setPayOk(true);
      await load();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Pagamento não aprovado.");
    } finally {
      setPaying(false);
    }
  }

  async function payPix(e: FormEvent) {
    e.preventDefault();
    if (!modalPlan) return;
    setPayError("");
    const err = validCustomer();
    if (err) return setPayError(err);
    const phoneDigits = phone.replace(/\D/g, "");
    const phoneE164 = phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`;
    setPaying(true);
    try {
      const r = await fetch("/api/billing/cakto/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          plan: modalPlan.id,
          method: "pix_auto",
          customer: { name: name.trim(), email: email.trim(), phone: phoneE164, docType: "cpf", docNumber: stripCpf(cpf) },
        }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error || "Não foi possível gerar o Pix.");
      if (!b.qrCode) throw new Error("Cakto não devolveu o QR Code.");
      setPixData({ qrCode: b.qrCode, expirationDate: b.expirationDate || null, checkoutUrl: b.checkoutUrl || null });
      for (let i = 0; i < 24; i++) {
        await new Promise((res) => setTimeout(res, 5000));
        try {
          const s = await fetch("/api/billing/cakto/status");
          const sb = await s.json();
          if (s.ok && sb.subscription && sb.subscription.plan === modalPlan.id && sb.subscription.status === "active") {
            setPayOk(true);
            await load();
            break;
          }
        } catch {
          /* tenta de novo */
        }
      }
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Não foi possível gerar o Pix.");
    } finally {
      setPaying(false);
    }
  }

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);

  async function cancel() {
    if (!confirmCancel) { setConfirmCancel(true); return; }
    setCanceling(true);
    try {
      const r = await fetch("/api/billing/cakto/cancel", { method: "POST" });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error || "Não foi possível cancelar.");
      setConfirmCancel(false);
      await load();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Não foi possível cancelar.");
    } finally {
      setCanceling(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Assinatura" subtitle="Carregando planos...">
        <div className="metric-card rounded-xl p-10 text-center text-slate-500">Carregando...</div>
      </AppShell>
    );
  }

  const activePlan = sub && (sub.status === "active" || sub.status === "past_due") ? sub : null;
  const activePlanName = plans.find((p) => p.id === activePlan?.plan)?.name || activePlan?.plan || "";
  
  // Determine display state
  const displayState = sub?.status === "active" ? "active" : 
                       sub?.status === "past_due" ? "past_due" :
                       sub?.status === "canceled" ? "canceled" :
                       sub?.status === "paused" ? "paused" :
                       sub?.status === "demo" ? "demo" : "inactive";
  
  const isDemoOrInactive = displayState === "demo" || displayState === "inactive";
  const isPendingPayment = displayState === "past_due";
  const isActiveSubscription = displayState === "active";
  const isCanceled = displayState === "canceled";

  return (
    <AppShell title="Assinatura" subtitle="Escolha o plano que acompanha seu volume. Excedente R$ 0,10/venda só com aceite explícito (desativado por padrão).">
      {isPlanoRoute ? (
        <button
          type="button"
          onClick={enterVitrine}
          aria-label="Fechar e ver o painel"
          title="Ver o painel"
          className="fixed right-4 top-4 z-50 grid size-10 place-items-center rounded-full border border-white/15 bg-black/60 text-slate-300 backdrop-blur transition hover:bg-white/10 hover:text-white"
        >
          <X className="size-5" />
        </button>
      ) : null}
      {loadError ? (
        <p role="alert" className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300">
          {loadError}{" "}
          <button onClick={() => { setLoading(true); setLoadError(""); load(); }} className="font-medium underline underline-offset-2">
            Tentar de novo
          </button>
        </p>
      ) : null}
      {isDemoOrInactive ? (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-200">
          <div className="flex items-center gap-2"><ShieldCheck className="size-4" /><b>Modo demonstração</b></div>
          <p className="mt-1">Você pode navegar em tudo, mas criar ou alterar exige um plano ativo.</p>
          <p className="mt-2 text-xs text-blue-600">Nenhuma cobrança será feita até você assinar um plano.</p>
        </div>
      ) : isPendingPayment ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
          <div className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" /><b>Pagamento pendente</b></div>
          <p className="mt-1">Seu pagamento está sendo processado. O acesso será liberado assim que confirmado.</p>
          <p className="mt-2 text-xs text-amber-600">Nenhum recurso pago está disponível até a confirmação.</p>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" onClick={load}>Verificar status</Button>
            {activePlan && <Button variant="outline" size="sm" onClick={() => openCheckout(plans.find(p => p.id === activePlan!.plan)!)}>Tentar novamente</Button>}
          </div>
        </div>
      ) : isActiveSubscription ? (
        <div className="mb-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/[.06] p-4">
            <div>
              <b className="text-emerald-700 dark:text-emerald-300">
                Plano {activePlanName} {sub?.planVersion ? `· v${sub.planVersion}` : ""} · Ativo
                {sub?.cancelAtPeriodEnd ? " · cancela no fim do ciclo" : ""}
                {sub?.scheduledPlan ? ` · downgrade para ${sub.scheduledPlan} no próximo ciclo` : ""}
              </b>
              <p className="mt-1 text-sm text-slate-500">
                {activePlan.currentPeriodEnd
                  ? `Período atual até ${new Date(activePlan.currentPeriodEnd * 1000).toLocaleDateString("pt-BR")}`
                  : "Assinatura ativa"}
                {sub?.excessEnabled ? ` · excedente até R$ ${((sub.excessCap ?? 0) / 100).toFixed(2)}` : " · excedente desativado"}
              </p>
            </div>
            <button
              onClick={() => setShowManageModal(true)}
              className={`rounded-lg border px-4 py-2 text-sm transition ${"border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-500/30 dark:text-slate-300 dark:hover:bg-slate-500/10"}`}
            >
              Gerenciar assinatura
            </button>
          </div>
          {usage ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[.03]">
              <div className="flex items-center justify-between text-sm"><b>Vendas no ciclo</b><span className="tabular-nums text-slate-500">{usage.count} / {usage.limit} · {usage.pct}%</span></div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className={`h-full ${usage.pct >= 100 ? "bg-red-500" : usage.pct >= 90 ? "bg-amber-500" : usage.pct >= 80 ? "bg-amber-400" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, usage.pct)}%` }} /></div>
              {usage.pct >= 80 ? <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{usage.pct >= 100 ? "Franquia atingida — novas vendas ficam aguardando regularização (sem perda). Faça upgrade." : usage.pct >= 90 ? "90% da franquia — considere upgrade." : "80% da franquia — acompanhe seu consumo."}</p> : null}
            </div>
          ) : null}
        </div>
      ) : isCanceled ? (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[.03] dark:text-slate-300">
          <div className="flex items-center gap-2"><Ban className="size-4" /><b>Assinatura cancelada</b></div>
          <p className="mt-1">Sua assinatura foi cancelada. Acesso mantido até o fim do período pago.</p>
          {sub?.currentPeriodEnd && <p className="mt-1 text-xs text-slate-500">Válido até {new Date(sub.currentPeriodEnd * 1000).toLocaleDateString("pt-BR")}</p>}
          <Button variant="outline" size="sm" className="mt-3" onClick={() => location.href = "/planos"}>Reativar assinatura</Button>
        </div>
      ) : (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200">
          <div className="flex items-center gap-2"><AlertCircle className="size-4" /><b>Assinatura expirada</b></div>
          <p className="mt-1">Esta assinatura não está mais ativa. Escolha um plano abaixo para reativar.</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((p) => {
          const isCurrent = activePlan?.plan === p.id;
          const canPay = p.configured && sdkOk;
          return (
            <div key={p.id} className={`metric-card rounded-xl p-6 ${p.hot ? "border-violet-400/40" : ""}`}>
              {p.hot ? (
                <span className="mb-3 inline-block rounded-full bg-violet-500/20 px-3 py-1 text-xs text-violet-700 dark:text-violet-200">
                  Mais popular
                </span>
              ) : null}
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <p className="mt-1 text-2xl font-bold text-violet-700 dark:text-violet-200">{p.priceLabel}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                {p.feats.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" /> {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <span className="mt-5 block rounded-lg bg-emerald-500/15 px-4 py-2.5 text-center text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  Plano atual
                </span>
              ) : (
                <button
                  onClick={() => canPay && openCheckout(p)}
                  disabled={!canPay}
                  title={!p.configured ? "Checkout deste plano em configuração" : !sdkOk ? "Checkout em configuração" : `Assinar ${p.name}`}
                  className="mt-5 block w-full rounded-lg bg-violet-600 px-4 py-2.5 text-center text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {activePlan ? `Trocar para ${p.name}` : `Assinar ${p.name}`}
                </button>
              )}
              {!canPay && !isCurrent ? (
                <p className="mt-2 text-center text-[11px] text-slate-400">Checkout em configuração</p>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
        <Lock className="size-3.5" /> Pagamento processado pela Cakto. O número do cartão nunca passa pelo nosso servidor.
      </p>
      <p className="mt-2 text-xs text-slate-500">
        Precisa de TikTok + Meta juntos? Veja a{" "}
        <a href="/conta/assinatura-avancada" className="text-violet-600 underline dark:text-violet-300">
          Assinatura Avançado
        </a>
        .
      </p>

      {showManageModal && isActiveSubscription && activePlan ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-5">
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-white/10 bg-[#101521] p-6 text-slate-100 sm:rounded-3xl sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <img
                  src="/ghostscale-logo.png"
                  alt="GhostScale"
                  className="h-8 w-auto max-w-[160px] object-contain drop-shadow-[0_0_14px_rgba(255,48,80,.35)]"
                />
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">Gerenciar assinatura</p>
                <h3 className="mt-1 text-xl font-semibold">
                  Plano {activePlanName} · {activePlan.currentPeriodEnd ? `até ${new Date(activePlan.currentPeriodEnd * 1000).toLocaleDateString("pt-BR")}` : "ativo"}
                </h3>
              </div>
              <button
                onClick={() => setShowManageModal(false)}
                aria-label="Fechar"
                className="rounded-lg border border-white/10 p-2 text-slate-400 hover:bg-white/5 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
                <h4 className="text-sm font-medium text-slate-300">Cancelar renovação</h4>
                <p className="mt-1 text-sm text-slate-400">Seu acesso continua até o fim do período pago. Após isso, a assinatura não será renovada automaticamente.</p>
                <p className="mt-1 text-sm text-slate-400">Você pode reativar a qualquer momento antes do fim do período.</p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => { setConfirmCancel(true); cancel(); }}
                    disabled={canceling}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-60"
                  >
                    {canceling ? "Cancelando..." : confirmCancel ? "Clique de novo para confirmar" : "Cancelar renovação"}
                  </button>
                  <button
                    onClick={() => setShowManageModal(false)}
                    className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-center text-sm font-medium text-slate-300 hover:bg-white/5"
                  >
                    Voltar
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
                <h4 className="text-sm font-medium text-slate-300">Trocar de plano</h4>
                <p className="mt-1 text-sm text-slate-400">Escolha outro plano na lista abaixo. A alteração entra em vigor no próximo ciclo.</p>
              </div>

              <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
                <h4 className="text-sm font-medium text-slate-300">Excedente</h4>
                <p className="mt-1 text-sm text-slate-400">{sub?.excessEnabled ? `Ativo · teto R$ ${((sub.excessCap ?? 0) / 100).toFixed(2)}` : "Desativado (padrão)"}</p>
                <p className="mt-1 text-xs text-slate-500">R$ 0,10 por venda excedente. Só cobrado com seu aceite explícito.</p>
              </div>

              <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
                <h4 className="text-sm font-medium text-slate-300">Histórico de pagamentos</h4>
                <p className="mt-1 text-sm text-slate-400">Disponível em breve.</p>
              </div>
            </div>

            <button
              onClick={() => setShowManageModal(false)}
              className="mt-6 w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-300 hover:bg-white/5"
            >
              Fechar
            </button>
          </div>
        </div>
      ) : null}
{modalPlan ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-5">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#101521] p-6 text-slate-100 sm:rounded-3xl sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <img
                  src="/ghostscale-logo.png"
                  alt="GhostScale"
                  className="h-8 w-auto max-w-[160px] object-contain drop-shadow-[0_0_14px_rgba(255,48,80,.35)]"
                />
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-red-400">Checkout seguro</p>
                <h3 className="mt-1 text-xl font-semibold">
                  {modalPlan.name} · {modalPlan.priceLabel}
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Cobrança hoje: <b className="text-white">{brl(modalPlan.price)}</b>
                  {payMethod === "card" && installments > 1 ? ` em ${installments}x de ${brl(modalPlan.price / installments)}` : " à vista"}
                  {payMethod === "card" ? " no cartão." : " no Pix Automático (recorrência)."}
                </p>
              </div>
              <button
                onClick={() => !paying && setModalPlan(null)}
                aria-label="Fechar"
                className="rounded-lg border border-white/10 p-2 text-slate-400 hover:bg-white/5 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-black/30 p-1">
              <button
                type="button"
                onClick={() => { setPayMethod("card"); setPayError(""); }}
                className={`h-10 rounded-lg text-sm font-semibold transition ${payMethod === "card" ? "bg-white text-black dark:bg-white dark:text-black" : "text-slate-400 hover:text-white"}`}
              >
                Cartão de crédito
              </button>
              <button
                type="button"
                onClick={() => { setPayMethod("pix"); setPayError(""); }}
                className={`h-10 rounded-lg text-sm font-semibold transition ${payMethod === "pix" ? "bg-white text-black dark:bg-white dark:text-black" : "text-slate-400 hover:text-white"}`}
              >
                Pix Automático
              </button>
            </div>

            {payOk ? (
              <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-6 text-center">
                <span className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-500/20 text-emerald-300">
                  <Check className="size-6" />
                </span>
                <b className="mt-3 block text-lg text-emerald-200">Assinatura ativa!</b>
                <p className="mt-1 text-sm text-slate-400">O plano {modalPlan.name} já está valendo na sua conta.</p>
                <button
                  onClick={() => setModalPlan(null)}
                  className="mt-5 w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-400"
                >
                  Começar a usar
                </button>
              </div>
            ) : payMethod === "pix" ? (
              pixData ? (
                <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                  <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-[#FF0030]/[.12] to-transparent p-4">
                    <img
                      src="https://i.imgur.com/yExNdU0.png"
                      alt="Pix"
                      className="h-8 w-auto object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    <div className="text-right">
                      <p className="text-xs text-slate-400">
                        {modalPlan.name} · Pix Automático
                      </p>
                      <b className="text-lg text-white">{brl(modalPlan.price)}</b>
                    </div>
                  </div>
                  <div className="p-5 text-center">
                    <b className="text-emerald-200">Escaneie o QR Code no app do banco</b>
                    <p className="mt-1 text-xs text-slate-400">
                      Isso autoriza a recorrência mensal — as próximas cobranças debitam sozinhas.
                    </p>
                    <div className="mx-auto mt-4 w-fit rounded-2xl bg-white p-3 shadow-[0_0_50px_-12px_rgba(52,211,153,.45)] dark:bg-white">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(pixData.qrCode)}`}
                        alt="QR Code Pix"
                        width={220}
                        height={220}
                        className="size-[220px] rounded-lg"
                      />
                    </div>
                    <p className="mt-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Chave Pix (copia e cola)
                    </p>
                    <p className="mt-1 max-h-24 overflow-y-auto break-all rounded-xl bg-black/50 p-3 text-left text-xs text-slate-300">
                      {pixData.qrCode}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(pixData.qrCode)}
                        className="h-11 flex-1 rounded-xl bg-[#ff0030] text-sm font-semibold text-white transition hover:bg-[#d60029]"
                      >
                        Copiar chave Pix
                      </button>
                      {pixData.checkoutUrl ? (
                        <a href={pixData.checkoutUrl} target="_blank" rel="noreferrer" className="grid h-11 flex-1 place-items-center rounded-xl border border-white/15 text-sm font-semibold hover:bg-white/5">
                          Abrir checkout
                        </a>
                      ) : null}
                    </div>
                    {pixData.expirationDate ? (
                      <p className="mt-2 text-xs text-slate-400">Expira em {new Date(pixData.expirationDate).toLocaleString("pt-BR")}</p>
                    ) : null}
                    <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-400">
                      <Loader2 className="size-3.5 animate-spin" /> Aguardando autorização no app do banco...
                    </p>
                    <button
                      type="button"
                      onClick={() => setPixData(null)}
                      className="mt-3 text-xs text-slate-500 underline underline-offset-4 hover:text-slate-300"
                    >
                      Voltar e corrigir dados
                    </button>
                    {payError ? (
                      <p role="alert" className="mt-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">
                        {payError}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : (
              <form onSubmit={payPix} className="mt-6 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-300">Nome completo</span>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" autoComplete="name" required className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 outline-none placeholder:text-slate-600 focus:border-red-500/60" />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-300">E-mail</span>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="voce@empresa.com" autoComplete="email" required className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 outline-none placeholder:text-slate-600 focus:border-red-500/60" />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-300">CPF</span>
                    <input value={cpf} onChange={(e) => setCpf(formatCpf(e.target.value))} inputMode="numeric" placeholder="000.000.000-00" maxLength={14} required className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 outline-none placeholder:text-slate-600 focus:border-red-500/60" />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-300">Celular</span>
                    <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 13))} inputMode="tel" placeholder="11999999999" autoComplete="tel" required className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 outline-none placeholder:text-slate-600 focus:border-red-500/60" />
                  </label>
                </div>
                {payError ? (
                  <p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">
                    {payError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={paying}
                  className="group flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-[#ff0030] text-[15px] font-semibold text-white transition hover:bg-[#d60029] disabled:opacity-60"
                >
                  {paying ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" /> Gerando Pix...
                    </span>
                  ) : (
                    <>Gerar Pix {brl(modalPlan.price)}</>
                  )}
                </button>
                <p className="text-center text-[11px] text-slate-500">
                  Pix Automático: você autoriza uma vez no app do banco e as próximas mensalidades debitam sozinhas.
                </p>
              </form>
              )
            ) : (
              <form onSubmit={pay} className="mt-6 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-300">Nome completo</span>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" autoComplete="name" required className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 outline-none placeholder:text-slate-600 focus:border-red-500/60" />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-300">E-mail</span>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="voce@empresa.com" autoComplete="email" required className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 outline-none placeholder:text-slate-600 focus:border-red-500/60" />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-300">CPF</span>
                    <input value={cpf} onChange={(e) => setCpf(formatCpf(e.target.value))} inputMode="numeric" placeholder="000.000.000-00" maxLength={14} required className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 outline-none placeholder:text-slate-600 focus:border-red-500/60" />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-300">Celular</span>
                    <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 13))} inputMode="tel" placeholder="11999999999" autoComplete="tel" required className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 outline-none placeholder:text-slate-600 focus:border-red-500/60" />
                  </label>
                </div>
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-300">Número do cartão</span>
                  <input value={card} onChange={(e) => setCard(formatCard(e.target.value))} inputMode="numeric" placeholder="4111 1111 1111 1111" autoComplete="cc-number" required className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 tracking-widest outline-none placeholder:text-slate-600 focus:border-red-500/60" />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-300">Nome impresso no cartão</span>
                  <input value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="COMO ESTÁ NO CARTÃO" autoComplete="cc-name" required className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 uppercase outline-none placeholder:text-slate-600 focus:border-red-500/60" />
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-300">Validade</span>
                    <input value={exp} onChange={(e) => setExp(formatExp(e.target.value))} inputMode="numeric" placeholder="MM/AA" autoComplete="cc-exp" required className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 outline-none placeholder:text-slate-600 focus:border-red-500/60" />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-300">CVV</span>
                    <input value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="123" autoComplete="cc-csc" required className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 outline-none placeholder:text-slate-600 focus:border-red-500/60" />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-300">Parcelas</span>
                    <select value={installments} onChange={(e) => setInstallments(Number(e.target.value))} className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-2 text-slate-200 outline-none focus:border-red-500/60">
                      {Array.from({ length: Math.min(12, Math.max(1, Math.floor(modalPlan.price / 5))) }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n} className="bg-[#101522]">
                          {n}x de {brl(modalPlan.price / n)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {payError ? (
                  <p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">
                    {payError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={paying}
                  className="group flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-[#ff0030] text-[15px] font-semibold text-white transition hover:bg-[#d60029] disabled:opacity-60"
                >
                  {paying ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" /> Processando...
                    </span>
                  ) : (
                    <>
                      Pagar {brl(modalPlan.price)}
                      <span className="grid size-7 place-items-center rounded-full bg-white/20 transition-all duration-300 group-hover:scale-125 group-hover:bg-white group-hover:text-[#ff0030]">
                        <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.75} />
                      </span>
                    </>
                  )}
                </button>
                <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-500">
                  <ShieldCheck className="size-3.5" /> Cartão tokenizado pela Cakto · Cancele quando quiser
                </p>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
