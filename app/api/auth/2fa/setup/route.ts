import { eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { users } from "@/db/schema";
import {
  encryptSecret,
  generateTotpSecret,
  hasConflictingOrigin,
  requestUserIdAllowPending,
  totpAuthUrl,
  verifyTotpCode,
  decryptSecret,
} from "@/lib/trackbase-security";

// POST: inicia o 2FA — gera segredo, guarda cifrado (ainda desativado) e
// devolve a URL otpauth para o usuário escanear no app autenticador.
// Aceita sessão pendente (fluxo de 2FA obrigatório no login).
export async function POST(request: Request) {
  if (hasConflictingOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const userId = await requestUserIdAllowPending(request);
  if (!userId || userId === "trackbase-owner") return Response.json({ error: "Não autenticado." }, { status: 401 });
  try {
    await ensureDb();
    const [user] = await getDb().select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return Response.json({ error: "Não autenticado." }, { status: 401 });
    if (user.totpEnabled) return Response.json({ error: "2FA já está ativo." }, { status: 400 });
    const secret = generateTotpSecret();
    const secured = await encryptSecret(secret);
    await getDb()
      .update(users)
      .set({ totpSecretCipher: secured.cipher, totpIv: secured.iv, totpEnabled: 0 })
      .where(eq(users.id, userId));
    return Response.json({ otpauth_url: totpAuthUrl(secret, user.email), secret });
  } catch (error) {
    console.error("2fa setup", error);
    return Response.json({ error: "Erro interno." }, { status: 500 });
  }
}

// DELETE {code}: desativa o 2FA (exige um código válido atual).
export async function DELETE(request: Request) {
  if (hasConflictingOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const userId = await requestUserIdAllowPending(request);
  if (!userId || userId === "trackbase-owner") return Response.json({ error: "Não autenticado." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { code?: string };
  try {
    await ensureDb();
    const [user] = await getDb().select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user?.totpEnabled || !user.totpSecretCipher || !user.totpIv)
      return Response.json({ error: "2FA não está ativo." }, { status: 400 });
    const ok = await verifyTotpCode(await decryptSecret(user.totpSecretCipher, user.totpIv), String(body.code || ""));
    if (!ok) return Response.json({ error: "Código inválido." }, { status: 401 });
    await getDb()
      .update(users)
      .set({ totpSecretCipher: null, totpIv: null, totpEnabled: 0 })
      .where(eq(users.id, userId));
    return Response.json({ disabled: true });
  } catch (error) {
    console.error("2fa disable", error);
    return Response.json({ error: "Erro interno." }, { status: 500 });
  }
}
