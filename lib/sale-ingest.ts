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
import { and, asc, eq, lte, lt } from "drizzle-orm";
import { capiOutbox, events, orders, projects } from "@/db/schema";
import { decryptSecret } from "@/lib/trackbase-security";
import type { getDb } from "@/db";

type Db = ReturnType<typeof getDb>;

export const CAPI_TIMEOUT_MS = 10000;
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
  if (/chargeback|contestad/.test(s)) return { status: "chargeback", known: true };
  if (/cancel|failed|recusad|expired/.test(s)) return { status: "cancelled", known: true };
  if (/pending|waiting|processing|created|initiated|in_review|review|awaiting|aguard|criad|processando|analise/.test(s))
    return { status: "pending", known: true };
  return { status: "pending", known: false };
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
  if (clean) return clean;
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
    .select({ status: orders.status })
    .from(orders)
    .where(and(eq(orders.provider, input.provider), eq(orders.externalId, input.externalId)))
    .limit(1);
  const prev = existing[0]?.status ?? null;
  if (prev === input.status) return { dedup: true, prevStatus: prev };
  const now = Math.floor(Date.now() / 1000);
  if (!prev) {
    await db
      .insert(orders)
      .values({ id: crypto.randomUUID(), ...input, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: [orders.provider, orders.externalId],
        set: { status: input.status, value: input.value, currency: input.currency, eventId: input.eventId, updatedAt: now },
      });
  } else {
    await db
      .update(orders)
      .set({
        status: input.status,
        value: input.value,
        currency: input.currency,
        utmCampaign: input.utmCampaign,
        utmSource: input.utmSource,
        utmMedium: input.utmMedium,
        utmContent: input.utmContent,
        utmTerm: input.utmTerm,
        eventId: input.eventId,
        updatedAt: now,
      })
      .where(and(eq(orders.provider, input.provider), eq(orders.externalId, input.externalId)));
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

// POST na Meta com timeout — nunca estoura o tempo do webhook.
export async function dispatchCapi(pixelId: string, accessToken: string, body: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`https://graph.facebook.com/v25.0/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(CAPI_TIMEOUT_MS),
    });
    if (!res.ok) return { ok: false, error: `meta ${res.status}` };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message.slice(0, 160) : "capi_error" };
  }
}

export async function enqueueCapiOutbox(
  db: Db,
  input: { workspaceId: string; projectId: string; pixelId: string; eventName: string; eventId: string; payload: Record<string, unknown> },
) {
  const now = Math.floor(Date.now() / 1000);
  await db.insert(capiOutbox).values({
    id: crypto.randomUUID(),
    ...input,
    payload: JSON.stringify(input.payload),
    status: "pending",
    attempts: 0,
    nextAttemptAt: now + backoffFor(0),
    createdAt: now,
    updatedAt: now,
  });
}

// Drena pendências vencidas (piggyback do webhook, cron ou worker).
// Nunca joga exceção — o chamador (webhook) não pode quebrar por causa disso.
export async function drainCapiOutbox(db: Db, opts: { workspaceId?: string; limit?: number } = {}) {
  const result = { processed: 0, sent: 0, dead: 0 };
  try {
    const now = Math.floor(Date.now() / 1000);
    const conds = [eq(capiOutbox.status, "pending"), lte(capiOutbox.nextAttemptAt, now)];
    if (opts.workspaceId) conds.push(eq(capiOutbox.workspaceId, opts.workspaceId));
    const due = await db.select().from(capiOutbox).where(and(...conds)).orderBy(asc(capiOutbox.nextAttemptAt)).limit(opts.limit ?? 5);
    for (const row of due) {
      result.processed++;
      await db.update(capiOutbox).set({ status: "processing", updatedAt: now }).where(eq(capiOutbox.id, row.id));
      try {
        const [proj] = await db
          .select({ pixelId: projects.pixelId, cipher: projects.metaTokenCipher, iv: projects.metaTokenIv })
          .from(projects)
          .where(eq(projects.id, row.projectId))
          .limit(1);
        if (!proj?.pixelId || !proj.cipher || !proj.iv) throw new Error("pixel/token removido");
        const sent = await dispatchCapi(proj.pixelId, await decryptSecret(proj.cipher, proj.iv), JSON.parse(row.payload) as Record<string, unknown>);
        if (sent.ok) {
          await db.delete(capiOutbox).where(eq(capiOutbox.id, row.id));
          result.sent++;
          continue;
        }
        throw new Error(sent.error || "capi_error");
      } catch (error) {
        const attempts = row.attempts + 1;
        const message = error instanceof Error ? error.message.slice(0, 200) : "capi_error";
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
