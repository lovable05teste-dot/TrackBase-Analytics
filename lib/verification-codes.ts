// Códigos de verificação de 6 dígitos (recuperação de senha e confirmação
// de e-mail). Regras de segurança concentradas aqui para os dois fluxos:
// - código em claro nunca é persistido (só SHA-256);
// - expiração curta (10 min), tentativas limitadas (5 por código);
// - reenvio limitado (60s por e-mail) + teto de 5 códigos/hora por e-mail;
// - novo código invalida os anteriores do mesmo (e-mail, finalidade).
import { and, asc, desc, eq, gte, isNull } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { users, verificationCodes } from "@/db/schema";
import { generateNumericCode, sha256, timingSafeEqual } from "./trackbase-security";

export { generateNumericCode };

export const CODE_TTL_SECONDS = 600; // 10 min
export const CODE_RESEND_SECONDS = 60; // anti-spam de reenvio
export const CODE_MAX_ATTEMPTS = 5; // tentativas por código
export const CODE_MAX_PER_HOUR = 5; // códigos por hora por e-mail
export const RESET_TOKEN_TTL_SECONDS = 900; // 15 min p/ etapa final

export type CodePurpose = "password_reset" | "email_verify";

export function isCodePurpose(value: unknown): value is CodePurpose {
  return value === "password_reset" || value === "email_verify";
}

type RequestResult =
  | { status: "ready"; userId: string; email: string }
  | { status: "nothing-to-do" } // e-mail inexistente / já verificado → resposta genérica
  | { status: "rate-limited"; retryAfter: number };

/** Valida destinatário e anti-spam. Não envia nada — só decide. */
export async function prepareCodeRequest(email: string, purpose: CodePurpose): Promise<RequestResult> {
  await ensureDb();
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const [user] = await db.select({ id: users.id, verified: users.emailVerifiedAt }).from(users).where(eq(users.email, email)).limit(1);
  if (!user) return { status: "nothing-to-do" };
  if (purpose === "email_verify" && user.verified) return { status: "nothing-to-do" };
  const [latest] = await db
    .select({ createdAt: verificationCodes.createdAt })
    .from(verificationCodes)
    .where(and(eq(verificationCodes.email, email), eq(verificationCodes.purpose, purpose)))
    .orderBy(desc(verificationCodes.createdAt))
    .limit(1);
  if (latest && latest.createdAt > now - CODE_RESEND_SECONDS)
    return { status: "rate-limited", retryAfter: latest.createdAt + CODE_RESEND_SECONDS - now };
  const recent = await db
    .select({ createdAt: verificationCodes.createdAt })
    .from(verificationCodes)
    .where(and(eq(verificationCodes.email, email), eq(verificationCodes.purpose, purpose), gte(verificationCodes.createdAt, now - 3600)))
    .orderBy(asc(verificationCodes.createdAt))
    .limit(CODE_MAX_PER_HOUR + 1);
  if (recent.length > CODE_MAX_PER_HOUR)
    return { status: "rate-limited", retryAfter: Math.max(1, recent[0].createdAt + 3600 - now) };
  return { status: "ready", userId: user.id, email };
}

/** Persiste o código (hash) e invalida anteriores em aberto. Retorna o claro. */
export async function issueCode(userId: string, email: string, purpose: CodePurpose) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const code = generateNumericCode();
  await db
    .update(verificationCodes)
    .set({ usedAt: now })
    .where(and(eq(verificationCodes.email, email), eq(verificationCodes.purpose, purpose), isNull(verificationCodes.usedAt)));
  await db.insert(verificationCodes).values({
    id: crypto.randomUUID(),
    userId,
    email,
    purpose,
    codeHash: await sha256(code),
    expiresAt: now + CODE_TTL_SECONDS,
    createdAt: now,
  });
  return code;
}

type VerifyResult = { status: "ok"; rowId: string; userId: string } | { status: "invalid" } | { status: "expired" } | { status: "locked" };

/** Confere o código: erro genérico p/ inexistente, específico p/ expirado/bloqueado. */
export async function checkCode(email: string, purpose: CodePurpose, code: string): Promise<VerifyResult> {
  await ensureDb();
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const [row] = await db
    .select()
    .from(verificationCodes)
    .where(and(eq(verificationCodes.email, email), eq(verificationCodes.purpose, purpose), isNull(verificationCodes.usedAt)))
    .orderBy(desc(verificationCodes.createdAt))
    .limit(1);
  if (!row) return { status: "invalid" };
  if (row.expiresAt < now) {
    await db.update(verificationCodes).set({ usedAt: now }).where(eq(verificationCodes.id, row.id));
    return { status: "expired" };
  }
  if ((row.attempts ?? 0) >= CODE_MAX_ATTEMPTS) {
    await db.update(verificationCodes).set({ usedAt: now }).where(eq(verificationCodes.id, row.id));
    return { status: "locked" };
  }
  if (!timingSafeEqual(await sha256(code), row.codeHash)) {
    await db.update(verificationCodes).set({ attempts: (row.attempts ?? 0) + 1 }).where(eq(verificationCodes.id, row.id));
    return { status: "invalid" };
  }
  return { status: "ok", rowId: row.id, userId: row.userId };
}

/** Marca o código como consumido (uso único — nunca reutilizável). */
export async function consumeCode(rowId: string) {
  await getDb().update(verificationCodes).set({ usedAt: Math.floor(Date.now() / 1000) }).where(eq(verificationCodes.id, rowId));
}
