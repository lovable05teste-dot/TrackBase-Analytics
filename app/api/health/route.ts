import { ensureDb, getDb } from "@/db";
import { metaConfig } from "@/lib/meta";

export const dynamic = "force-dynamic";

type Status = "ok" | "degraded" | "down";

async function checkDb(): Promise<{ status: Status; detail?: string }> {
  try {
    await ensureDb();
    // SELECT 1 valida conexão sem depender de tabela de negócio
    await (getDb() as unknown as { execute: (q: string) => Promise<unknown> }).execute?.("SELECT 1");
    return { status: "ok" };
  } catch (e) {
    return { status: "down", detail: e instanceof Error ? e.message : "db_error" };
  }
}

function checkEnv(): { status: Status; missing: string[] } {
  const missing: string[] = [];
  if (!process.env.TRACKBASE_ENCRYPTION_KEY) missing.push("TRACKBASE_ENCRYPTION_KEY");
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL && !process.env.STORAGE_DATABASE_URL && !process.env.STORAGE_POSTGRES_URL && !(process.env as Record<string, unknown>).DB) missing.push("DATABASE_URL");
  return { status: missing.length ? "degraded" : "ok", missing };
}

function checkMeta(): { status: Status; configured: boolean } {
  const c = metaConfig();
  const configured = Boolean(c.appId && c.appSecret);
  return { status: configured ? "ok" : "degraded", configured };
}

export async function GET() {
  const [db, env, meta] = [await checkDb(), checkEnv(), checkMeta()];
  // Sem fila dedicada (Redis/SQS/BullMQ): ingestão é síncrona direto no DB.
  // Reportamos como degraded por desenho para deixar o risco explícito.
  const queue = { status: "degraded" as Status, provider: "none (insert direto, sem retry)" };
  const worst: Status = [db.status, env.status, meta.status, queue.status].includes("down")
    ? "down"
    : [db.status, env.status, meta.status, queue.status].includes("degraded")
      ? "degraded"
      : "ok";
  return Response.json(
    {
      status: worst,
      time: new Date().toISOString(),
      components: { database: db, env, meta, queue },
    },
    { status: worst === "down" ? 503 : 200, headers: { "cache-control": "no-store" } },
  );
}
