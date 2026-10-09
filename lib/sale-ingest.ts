// Núcleo compartilhado da ingestão de vendas (gateway universal + utmify).
// Regras de confiabilidade concentradas aqui:
// - dedup por (provider, externalId): mesmo status repetido = 200 sem
//   reinserir evento nem re-disparar CAPI; transição de status atualiza;
// - eventId determinístico `purchase_<provider>_<externalId>` (antes faltava
//   o provider e gateways distintos colidiam no índice único);
// - CAPI com timeout + outbox com backoff (nunca perde a venda p/ a Meta);
// - status desconhecido vira `pending` + alerta (nunca 400 que dropa venda).
// O `db` vem por parâmetro tipado via `import type` (apagado em runtime) e o
// push é dinâmico — este módulo segue importável em testes unitários puros.
import { and, asc, desc, eq, lte, lt, or } from "drizzle-orm";
import { capiOutbox, events, orders, projects } from "@/db/schema";
import { decryptSecret } from "@/lib/trackbase-security";
import { dispatchCapi } from "@/lib/meta-capi";
export { dispatchCapi, CAPI_TIMEOUT_MS } from "@/lib/meta-capi";
import type { getDb } from "@/db";

type Db = ReturnType<typeof getDb>;

export const OUTBOX_MAX_ATTEMPTS = 6; // ~24h de backoff até DLQ
const BACKOFF_SECONDS = [60, 300, 1800, 7200, 43200, 86400];
const STALE_PROCESSING_SECONDS = 600;

export function pick(source: Record<string, unknown>, paths: string[]) {
  for (const path of paths) {
    let value: unknown = source;
    for (const key of path.split(".")) value = value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;
    if (value !== undefined && value !== null && value !== "") return value;
  }
}

// Mapeia status heterogêneos p/ o vocabulário interno. `known=false` =
// plataforma mandou algo novo → vira pending + alerta (nunca descarta).
export function resolveStatus(value: unknown): { status: string; known: boolean } {
  const s = String(value || "pending").toLowerCase();
  if (/approved|authorized|authorised|paid|completed|complete|succeeded|success|settled|captured|aprovad|autorizad|pago|liquidado|capturado/.test(s))
    return { status: "approved", known: true };
  if (/refund|reembols|estorn/.test(s)) return { status: "refunded", known: true };
  if (/chargeback|chargedback|contestad/.test(s)) return { status: "chargeback", known: true };
  if (/cancel|failed|refused|declined|recusad|expired/.test(s)) return { status: "cancelled", known: true };
  if (/pending|waiting|processing|created|initiated|in_review|review|awaiting|aguard|criad|processando|analise/.test(s))
    return { status: "pending", known: true };
  return { status: "pending", known: false };
}

// Alguns checkouts grudam um ID de rastreamento no utm_source
// ("facebookjLj6ac59377..."). Sem tirar, cada venda vira uma "origem"
// diferente nos relatórios.
export function cleanUtmSource(value: string | null | undefined) {
  const clean = String(value || "").replace(/jLj[0-9a-f]{12,}$/i, "").trim();
  return clean || null;
}

export function eventNameFor(status: string) {
  return status === "approved"
    ? "Purchase"
    : status === "pending"
      ? "PaymentPending"
      : status === "refunded"
        ? "Refund"
        : status === "chargeback"
          ? "Chargeback"
          : "PaymentCancelled";
}

// event_id da plataforma vence (deduplica com o pixel); senão determinístico
// por provider+pedido(+status p/ não-aprovados) — redelivery colide no índice
// único e vira no-op em vez de venda duplicada.
export function eventIdFor(provided: unknown, provider: string, externalId: string, status: string) {
  const clean = String(provided || "").trim();
  // Gateways may reuse event_id across pending -> approved. Keep the original
  // for Purchase deduplication, but namespace non-purchase statuses.
  if (clean) return status === "approved" ? clean : `${clean}_${status}`;
  const safeProvider = provider.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "gateway";
  const safeExternal = externalId.trim() || crypto.randomUUID();
  return status === "approved" ? `purchase_${safeProvider}_${safeExternal}` : `gw_${safeProvider}_${safeExternal}_${status}`;
}

export function backoffFor(attempts: number) {
  return BACKOFF_SECONDS[Math.min(Math.max(0, attempts), BACKOFF_SECONDS.length - 1)];
}

export function clientIpFromHeaders(headers: Headers, mode: "auto" | "ipv4" | "disabled") {
  if (mode === "disabled") return undefined;
  const values = (headers.get("cf-connecting-ip") || headers.get("x-forwarded-for") || "")
    .split(",")
    .map(v => v.trim())
    .filter(Boolean);
  return mode === "ipv4" ? values.find(v => /^\d{1,3}(\.\d{1,3}){3}$/.test(v)) : values[0];
}

// Dados do comprador para a CAPI. O webhook vem do SERVIDOR do gateway: o IP
// e o navegador da requisição são do gateway, não do cliente, e atrapalham a
// Meta a casar a venda com quem clicou no anúncio. Então buscamos a última
// visita da mesma pessoa (tb_vid ou fbclid) registrada pelo script.
export type VisitorContext = { ip?: string; ua?: string; fbc?: string; fbp?: string; url?: string };

export async function visitorContext(db: Db, projectId: string, keys: { visitorId?: string; fbclid?: string; fbp?: string; fbc?: string }): Promise<VisitorContext> {
  const conds = [keys.visitorId ? eq(events.visitorId, keys.visitorId) : null, keys.fbclid ? eq(events.fbclid, keys.fbclid) : null,
    keys.fbp ? eq(events.fbp, keys.fbp) : null, keys.fbc ? eq(events.fbc, keys.fbc) : null].filter((c): c is NonNullable<typeof c> => Boolean(c));
  if (!conds.length) return {};
  try {
    const rows = await db
      .select({ fbc: events.fbc, fbp: events.fbp, payload: events.payload })
      .from(events)
      .where(and(eq(events.projectId, projectId), eq(events.source, "browser"), conds.length > 1 ? or(...conds) : conds[0]))
      .orderBy(desc(events.occurredAt))
      .limit(5);
    const out: VisitorContext = {};
    for (const r of rows) {
      let p: Record<string, unknown> = {};
      try { p = JSON.parse(r.payload || "{}"); } catch {}
      out.ip ||= typeof p._ip === "string" ? p._ip : undefined;
      out.ua ||= typeof p._ua === "string" ? p._ua : undefined;
      out.url ||= typeof p.url === "string" ? p.url : undefined;
      out.fbc ||= r.fbc || undefined;
      out.fbp ||= r.fbp || undefined;
    }
    return out;
  } catch (error) {
    console.error("visitor context", error);
    return {};
  }
}

async function alertWorkspace(workspaceId: string, title: string, body: string, tag: string) {
  try {
    const { pushToWorkspace } = await import("@/lib/push");
    await pushToWorkspace(workspaceId, { title, body, url: "/vendas", tag });
  } catch (error) {
    console.error("ingest alert", error);
  }
}

export type OrderInput = {
  projectId: string;
  externalId: string;
  provider: string;
  status: string;
  value: number;
  currency: string;
  utmCampaign: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  eventId: string;
};

// Upsert do pedido com veredito de dedup. Retorna prevStatus para decidir se
// o CAPI deve disparar (só em criação ou transição PARA approved).
export async function upsertOrder(db: Db, input: OrderInput): Promise<{ dedup: boolean; prevStatus: string | null }> {
  const existing = await db
    .select({ status: orders.status, utmCampaign: orders.utmCampaign, utmSource: orders.utmSource, utmMedium: orders.utmMedium, utmContent: orders.utmContent, utmTerm: orders.utmTerm })
    .from(orders)
    .where(and(eq(orders.projectId, input.projectId), eq(orders.provider, input.provider), eq(orders.externalId, input.externalId)))
    .limit(1);
  const prev = existing[0]?.status ?? null;
  if (prev === input.status) return { dedup: true, prevStatus: prev };
  const now = Math.floor(Date.now() / 1000);
  if (!prev) {
    await db
      .insert(orders)
      .values({ id: crypto.randomUUID(), ...input, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: [orders.projectId, orders.provider, orders.externalId],
        set: { status: input.status, value: input.value, currency: input.currency, eventId: input.eventId, updatedAt: now },
      });
  } else {
    await db
      .update(orders)
      .set({
        status: input.status,
        value: input.value,
        currency: input.currency,
        // Webhook de transição (ex.: reembolso) muitas vezes vem sem tracking:
        // mantém a atribuição já gravada em vez de zerá-la.
        utmCampaign: input.utmCampaign || existing[0].utmCampaign,
        utmSource: input.utmSource || existing[0].utmSource,
        utmMedium: input.utmMedium || existing[0].utmMedium,
        utmContent: input.utmContent || existing[0].utmContent,
        utmTerm: input.utmTerm || existing[0].utmTerm,
        eventId: input.eventId,
        updatedAt: now,
      })
      .where(and(eq(orders.projectId, input.projectId), eq(orders.provider, input.provider), eq(orders.externalId, input.externalId)));
  }
  return { dedup: false, prevStatus: prev };
}

export type EventInput = {
  projectId: string;
  eventId: string;
  eventName: string;
  occurredAt: number;
  value: number;
  currency: string;
  visitorId: string;
  fbclid: string;
  fbc: string;
  fbp: string;
  utmSource: string;
  utmCampaign: string;
  utmMedium: string;
  utmContent: string;
  utmTerm: string;
  payload: string;
};

// Insere o evento UMA vez (índice único em project+eventId fecha a race de
// redelivery concorrente). Retorna true se ESTA chamada criou a linha.
export async function insertEventOnce(db: Db, row: EventInput, source = "gateway"): Promise<boolean> {
  const inserted = await db
    .insert(events)
    .values({ id: crypto.randomUUID(), source, ...row })
    .onConflictDoNothing()
    .returning({ id: events.id });
  return inserted.length > 0;
}

export async function enqueueCapiOutbox(
  db: Db,
  input: { workspaceId: string; projectId: string; pixelId: string; eventName: string; eventId: string; payload: Record<string, unknown>; immediate?: boolean },
) {
  const now = Math.floor(Date.now() / 1000);
  // Reuse pending rows made by versions that used random UUIDs.
  const [existing] = await db.select({ id: capiOutbox.id }).from(capiOutbox)
    .where(and(eq(capiOutbox.projectId, input.projectId), eq(capiOutbox.eventName, input.eventName), eq(capiOutbox.eventId, input.eventId))).limit(1);
  if (existing) return existing.id;
  const id = `capi:${input.projectId}:${input.eventName}:${input.eventId}`;
  const { immediate, ...record } = input;
  await db.insert(capiOutbox).values({
    id,
    ...record,
    payload: JSON.stringify(input.payload),
    status: "pending",
    attempts: 0,
    nextAttemptAt: immediate ? now : now + backoffFor(0),
    createdAt: now,
    updatedAt: now,
  }).onConflictDoNothing();
  return id;
}

// Drena pendências vencidas (piggyback do webhook, cron ou worker).
// Nunca joga exceção — o chamador (webhook) não pode quebrar por causa disso.
export async function drainCapiOutbox(db: Db, opts: { workspaceId?: string; limit?: number; id?: string } = {}) {
  const result = { processed: 0, sent: 0, dead: 0 };
  try {
    const now = Math.floor(Date.now() / 1000);
    const conds = [eq(capiOutbox.status, "pending"), lte(capiOutbox.nextAttemptAt, now)];
    if (opts.workspaceId) conds.push(eq(capiOutbox.workspaceId, opts.workspaceId));
    if (opts.id) conds.push(eq(capiOutbox.id, opts.id));
    const due = await db.select().from(capiOutbox).where(and(...conds)).orderBy(asc(capiOutbox.nextAttemptAt)).limit(opts.limit ?? 5);
    const deadline = Date.now() + 40000;
    for (const row of due) {
      if (Date.now() >= deadline) break;
      const claimed = await db.update(capiOutbox).set({ status: "processing", updatedAt: now })
        .where(and(eq(capiOutbox.id, row.id), eq(capiOutbox.status, "pending")))
        .returning({ id: capiOutbox.id });
      if (!claimed.length) continue;
      result.processed++;
      try {
        const [proj] = await db
          .select({ pixelId: projects.pixelId, cipher: projects.metaTokenCipher, iv: projects.metaTokenIv })
          .from(projects)
          .where(eq(projects.id, row.projectId))
          .limit(1);
        if (!proj?.pixelId || !proj.cipher || !proj.iv) throw new Error("pixel/token removido");
        if (row.pixelId && row.pixelId !== proj.pixelId) throw new Error("pixel alterado; revise o destino antes de reenviar");
        const payload = JSON.parse(row.payload) as Record<string, unknown>;
        // A saved test code must never divert a confirmed real purchase.
        if (row.eventName === "Purchase") delete payload.test_event_code;
        const sent = await dispatchCapi(proj.pixelId, await decryptSecret(proj.cipher, proj.iv), payload);
        if (sent.ok) {
          await db.update(capiOutbox).set({ status: "sent", pixelId: proj.pixelId, attempts: row.attempts + 1, lastError: null, updatedAt: now }).where(eq(capiOutbox.id, row.id));
          result.sent++;
          continue;
        }
        throw new Error(sent.error || "capi_error");
      } catch (error) {
        const attempts = row.attempts + 1;
        const message = error instanceof Error && /^(meta |pixel)/.test(error.message) ? error.message.slice(0, 200) : "Falha ao preparar envio; confira o token CAPI e a chave de criptografia.";
        if (attempts >= OUTBOX_MAX_ATTEMPTS) {
          await db.update(capiOutbox).set({ status: "dead", attempts, lastError: message, updatedAt: now }).where(eq(capiOutbox.id, row.id));
          result.dead++;
          await alertWorkspace(row.workspaceId, "CAPI com problema", `Evento ${row.eventName} não chegou à Meta após várias tentativas.`, `tb-capi-dead-${row.id}`);
        } else {
          await db
            .update(capiOutbox)
            .set({ status: "pending", attempts, nextAttemptAt: now + backoffFor(attempts), lastError: message, updatedAt: now })
            .where(eq(capiOutbox.id, row.id));
        }
      }
    }
  } catch (error) {
    console.error("outbox drain", error);
  }
  return result;
}

// Reaproveita 'processing' travado (instância morreu no meio do envio).
export async function resetStaleOutbox(db: Db) {
  try {
    const now = Math.floor(Date.now() / 1000);
    await db
      .update(capiOutbox)
      .set({ status: "pending", updatedAt: now })
      .where(and(eq(capiOutbox.status, "processing"), lt(capiOutbox.updatedAt, now - STALE_PROCESSING_SECONDS)));
  } catch (error) {
    console.error("outbox reset", error);
  }
}

// Alerta quando a plataforma manda status inédito (payload pode ter mudado).
export async function alertUnknownStatus(workspaceId: string, provider: string, externalId: string, raw: unknown) {
  await alertWorkspace(
    workspaceId,
    "Status novo no gateway",
    `${provider} mandou "${String(raw).slice(0, 40)}" (${externalId}). Entrou como pendente — confira a integração.`,
    `tb-unknown-${provider}-${externalId}`,
  );
}

// Contagem idempotente de vendas aprovadas por ciclo (workspace, provider, externalId).
// Só conta transição para approved pela primeira vez; replays não consomem franquia.
// Ao atingir 80/90/100% envia e-mail (dedupe por período). Nunca rejeita webhook.
export async function handleSalesQuota(
  db: Db,
  workspaceId: string,
  provider: string,
  externalId: string,
  prevStatus: string | null,
  nextStatus: string,
) {
  if (nextStatus !== "approved" || prevStatus === "approved") return;
  try {
    const { getEffectivePlan } = await import("@/lib/plans");
    // workspace -> user? derivar via planSubscriptions
    const { planSubscriptions } = await import("@/db/schema");
    const { eq, desc } = await import("drizzle-orm");
    const [sub] = await db.select().from(planSubscriptions).where(eq(planSubscriptions.workspaceId, workspaceId)).orderBy(desc(planSubscriptions.createdAt)).limit(1);
    if (!sub || sub.status !== "active") return;
    const eff = getEffectivePlan(sub.plan as never, (sub as { planVersion?: number | null }).planVersion);
    const limit = eff.limits.sales;
    if (!limit) return;
    const start = (sub as { currentPeriodStart?: number | null }).currentPeriodStart ?? sub.createdAt;
    const end = (sub as { currentPeriodEnd?: number | null }).currentPeriodEnd ?? start + 30 * 86400;
    const { usageCounters } = await import("@/db/schema");
    const { and } = await import("drizzle-orm");
    // incrementa atomically via insert + update (simples)
    const id = `${workspaceId}:sales:${start}`;
    const now = Math.floor(Date.now() / 1000);
    await db.insert(usageCounters).values({ id, workspaceId, metric: "sales", periodStart: start, periodEnd: end, count: 0, updatedAt: now }).onConflictDoNothing();
    // read then increment (race window pequeno; aceitável sem tx pesada)
    const [cur] = await db.select({ count: usageCounters.count }).from(usageCounters).where(and(eq(usageCounters.workspaceId, workspaceId), eq(usageCounters.metric, "sales"), eq(usageCounters.periodStart, start))).limit(1);
    const next = (cur?.count ?? 0) + 1;
    await db.update(usageCounters).set({ count: next, updatedAt: now }).where(and(eq(usageCounters.workspaceId, workspaceId), eq(usageCounters.metric, "sales"), eq(usageCounters.periodStart, start)));
    const pct = Math.round((next / limit) * 100);
    const thresholds = [80, 90, 100];
    if (!thresholds.includes(pct) && !(next === limit)) return;
    // evita spam: só envia quando cruza threshold
    const email = (sub as { email?: string | null }).email || "";
    if (!email) return;
    const { emailUsageWarning, emailLimitReached } = await import("@/lib/emails");
    if (pct >= 100) await emailLimitReached(email, limit);
    else await emailUsageWarning(email, next, limit, pct);
  } catch (e) {
    console.error("quota", e);
  }
}
