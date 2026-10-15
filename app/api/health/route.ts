import { ensureDb, getDb } from "@/db";
import { metaConfig } from "@/lib/meta";

export const dynamic = "force-dynamic";

type Status = "ok" | "degraded" | "down";

async function checkDb(): Promise<{ status: Status }> {
  try {
    await ensureDb();
    // SELECT 1 valida conexão sem depender de tabela de negócio
    await (getDb() as unknown as { execute: (q: string) => Promise<unknown> }).execute?.("SELECT 1");
    return { status: "ok" };
  } catch (e) {
    // Detalhe só no log do servidor: o endpoint é público.
    console.error("health: banco indisponível", e);
    return { status: "down" };
  }
}

function checkEnv(): { status: Status } {
  const missing: string[] = [];
  if (!process.env.TRACKBASE_ENCRYPTION_KEY) missing.push("TRACKBASE_ENCRYPTION_KEY");
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL && !process.env.STORAGE_DATABASE_URL && !process.env.STORAGE_POSTGRES_URL && !(process.env as Record<string, unknown>).DB) missing.push("DATABASE_URL");
  // Nomes das variáveis faltando vão só para o log do servidor.
  if (missing.length) console.error("health: variáveis de ambiente ausentes", missing.join(", "));
  return { status: missing.length ? "degraded" : "ok" };
}

function checkMeta(): { status: Status } {
  const c = metaConfig();
  return { status: c.appId && c.appSecret ? "ok" : "degraded" };
}

export async function GET() {
  const [db, env, meta] = [await checkDb(), checkEnv(), checkMeta()];
  // Sem fila dedicada (Redis/SQS/BullMQ): ingestão é síncrona direto no DB.
  // Reportamos como degraded por desenho para deixar o risco explícito.
  const queue = { status: "degraded" as Status };
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
