import { and, eq, gte } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { metaConnectLinks } from "@/db/schema";
import { sha256 } from "@/lib/trackbase-security";

// Link de conexão (multilogin/AdsPower): ?t=<token> gerado no painel. Serve
// para Meta e TikTok. Conecta a conta sem login da GhostScale no navegador.
export async function userFromConnectLink(request: Request) {
  const t = new URL(request.url).searchParams.get("t") || "";
  if (!/^[A-Za-z0-9_-]{32,80}$/.test(t)) return null;
  await ensureDb();
  const [row] = await getDb().select({ userId: metaConnectLinks.userId }).from(metaConnectLinks).where(and(eq(metaConnectLinks.tokenHash, await sha256(t)), gte(metaConnectLinks.expiresAt, Math.floor(Date.now() / 1000)))).limit(1);
  return row?.userId ?? null;
}
