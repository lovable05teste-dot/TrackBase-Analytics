import { eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { metaConnectLinks } from "@/db/schema";
import { requestUserId, sha256 } from "@/lib/trackbase-security";

export const dynamic = "force-dynamic";

const VALID_SECONDS = 86400;

// Gera o link de conexão para multilogin (AdsPower): abre a autorização do
// Facebook direto, sem login da GhostScale nem cookie no perfil. Só o hash
// do token fica salvo; gerar um novo link cancela o anterior.
export async function POST(request: Request) {
  const userId = await requestUserId(request);
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });
  await ensureDb();
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Buffer.from(bytes).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const db = getDb();
  await db.delete(metaConnectLinks).where(eq(metaConnectLinks.userId, userId));
  await db.insert(metaConnectLinks).values({ tokenHash: await sha256(token), userId, expiresAt: now + VALID_SECONDS, createdAt: now });
  const origin = new URL(request.url).origin;
  return Response.json({ url: `${origin}/api/meta/oauth/start?t=${token}`, expiresAt: now + VALID_SECONDS }, { headers: { "cache-control": "no-store" } });
}

export async function DELETE(request: Request) {
  const userId = await requestUserId(request);
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });
  await ensureDb();
  await getDb().delete(metaConnectLinks).where(eq(metaConnectLinks.userId, userId));
  return Response.json({ revoked: true });
}
