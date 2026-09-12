import { eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { passwordResets, users } from "@/db/schema";
import { RESET_TOKEN_TTL_SECONDS, checkCode, consumeCode, isCodePurpose } from "@/lib/verification-codes";
import { clientIpFromRequest, hasConflictingOrigin, randomToken, sha256 } from "@/lib/trackbase-security";

// POST {email, purpose, code}: valida o código de 6 dígitos.
// - password_reset → devolve `resetToken` (uso único, 15 min) p/ a tela final;
// - email_verify → confirma o e-mail e conclui na hora.
export async function POST(request: Request) {
  if (hasConflictingOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { email?: string; purpose?: string; code?: string };
  const email = String(body.email || "").trim().toLowerCase();
  const code = String(body.code || "").replaceAll(/\D/g, "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "Informe um e-mail válido." }, { status: 400 });
  if (!isCodePurpose(body.purpose)) return Response.json({ error: "Finalidade inválida." }, { status: 400 });
  if (!/^\d{6}$/.test(code)) return Response.json({ error: "Digite os 6 dígitos do código." }, { status: 400 });
  try {
    await ensureDb();
    const checked = await checkCode(email, body.purpose, code);
    if (checked.status === "expired") return Response.json({ error: "Código expirado. Peça um novo código.", expired: true }, { status: 400 });
    if (checked.status === "locked")
      return Response.json({ error: "Muitas tentativas incorretas. Peça um novo código.", expired: true }, { status: 429 });
    if (checked.status === "invalid") return Response.json({ error: "Código incorreto. Confira e tente de novo." }, { status: 400 });
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    await consumeCode(checked.rowId);
    if (body.purpose === "email_verify") {
      await db.update(users).set({ emailVerifiedAt: now }).where(eq(users.id, checked.userId));
      console.warn(JSON.stringify({ scope: "auth", event: "email-verified", at: new Date().toISOString() }));
      return Response.json({ ok: true });
    }
    // password_reset: token de etapa final (não expõe a sessão, só autoriza a troca).
    const resetToken = randomToken();
    await db.insert(passwordResets).values({
      id: crypto.randomUUID(),
      userId: checked.userId,
      tokenHash: await sha256(resetToken),
      expiresAt: now + RESET_TOKEN_TTL_SECONDS,
      createdAt: now,
    });
    console.warn(
      JSON.stringify({ scope: "auth", event: "code-verified", at: new Date().toISOString(), ip: clientIpFromRequest(request) }),
    );
    return Response.json({ ok: true, resetToken });
  } catch (error) {
    console.error("codes verify", error);
    return Response.json({ error: "Não foi possível validar agora. Tente de novo." }, { status: 500 });
  }
}
