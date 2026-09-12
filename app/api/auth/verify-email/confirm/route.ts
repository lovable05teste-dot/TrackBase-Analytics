import { eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { emailVerifications, users } from "@/db/schema";
import { hasConflictingOrigin, sha256 } from "@/lib/trackbase-security";

// POST {token}: confirma o e-mail (token de 24h, uso único).
export async function POST(request: Request) {
  if (hasConflictingOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { token?: string };
  const token = String(body.token || "");
  if (!token) return Response.json({ error: "Token inválido ou expirado." }, { status: 400 });
  try {
    await ensureDb();
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    const [row] = await db.select().from(emailVerifications).where(eq(emailVerifications.tokenHash, await sha256(token))).limit(1);
    if (!row || row.usedAt || row.expiresAt < now) return Response.json({ error: "Token inválido ou expirado." }, { status: 400 });
    await db.update(emailVerifications).set({ usedAt: now }).where(eq(emailVerifications.id, row.id));
    await db.update(users).set({ emailVerifiedAt: now }).where(eq(users.id, row.userId));
    return Response.json({ ok: true });
  } catch (error) {
    console.error("verify email", error);
    return Response.json({ error: "Erro interno." }, { status: 500 });
  }
}
