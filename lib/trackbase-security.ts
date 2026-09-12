const enc = new TextEncoder();
const dec = new TextDecoder();

export async function sha256(value: string) {
  const data = await crypto.subtle.digest("SHA-256", enc.encode(value));
  return Array.from(new Uint8Array(data), b => b.toString(16).padStart(2, "0")).join("");
}

function bytesToB64(bytes: Uint8Array) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
}

function b64ToBytes(value: string) {
  return Uint8Array.from(atob(value), c => c.charCodeAt(0));
}

function bytesToB64Url(bytes: Uint8Array) {
  return bytesToB64(bytes).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

/** Constant-time string compare to avoid timing oracles on secrets/tokens. */
export function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Random URL-safe token (32 bytes = 256 bits). */
export function randomToken(bytes = 32) {
  return bytesToB64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

// ---------------------------------------------------------------------------
// Password hashing (PBKDF2-SHA256 via WebCrypto — portable to Workers/Node).
// Legacy unsalted SHA-256 hashes are still *verified* for migration, then
// transparently re-hashed on next successful login.
// ---------------------------------------------------------------------------
const PBKDF2_ITERATIONS = 100000;

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToB64(salt)}$${bytesToB64(new Uint8Array(bits))}`;
}

export function isModernPasswordHash(hash: string) {
  return hash.startsWith("pbkdf2$");
}

export async function verifyPassword(password: string, stored: string): Promise<"valid" | "valid-legacy" | "invalid"> {
  if (isModernPasswordHash(stored)) {
    try {
      const [, iterRaw, saltB64, hashB64] = stored.split("$");
      const iterations = Number(iterRaw);
      if (!Number.isFinite(iterations) || iterations < 10000) return "invalid";
      const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
      const bits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", salt: b64ToBytes(saltB64), iterations, hash: "SHA-256" },
        key,
        256,
      );
      return timingSafeEqual(bytesToB64(new Uint8Array(bits)), hashB64) ? "valid" : "invalid";
    } catch {
      return "invalid";
    }
  }
  // Legacy: bare SHA-256 (no salt). Still accepted once, then upgraded.
  return timingSafeEqual(await sha256(password), stored) ? "valid-legacy" : "invalid";
}

const COMMON_PASSWORDS = new Set([
  "12345678", "123456789", "1234567890", "password", "password1", "senha123", "senha1234",
  "qwerty123", "abc12345", "123456a", "123456ab", "trackbase", "ghostscale", "admin123",
  "brasil123", "familia1", "jesus123", "mudar123", "teste123", "a12345678",
]);

/** Returns a human error message when the password fails policy, else null. */
export function passwordPolicyError(password: string) {
  if (password.length < 8) return "A senha precisa de ao menos 8 caracteres.";
  if (password.length > 128) return "A senha precisa de no máximo 128 caracteres.";
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return "Essa senha é muito comum. Escolha outra mais forte.";
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return "Use letras e números na senha.";
  return null;
}

// ---------------------------------------------------------------------------
// Secrets encryption (unchanged)
// ---------------------------------------------------------------------------
async function encryptionKey() {
  const secret = process.env.TRACKBASE_ENCRYPTION_KEY;
  if (!secret) throw new Error("Chave de proteção não configurada.");
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(), enc.encode(value));
  return { cipher: bytesToB64(new Uint8Array(encrypted)), iv: bytesToB64(iv) };
}

export async function decryptSecret(cipher: string, iv: string) {
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64ToBytes(iv) }, await encryptionKey(), b64ToBytes(cipher));
  return dec.decode(decrypted);
}

// ---------------------------------------------------------------------------
// Sessions — random opaque tokens, SHA-256 hashed at rest, with expiry.
// ---------------------------------------------------------------------------
export const SESSION_TTL_SECONDS = 30 * 24 * 3600;
export const PENDING_2FA_TTL_SECONDS = 600;

export function sessionCookie(token: string, maxAge = SESSION_TTL_SECONDS) {
  const secure = process.env.SECURE_COOKIES === "true" || (!process.env.SECURE_COOKIES && process.env.NODE_ENV === "production") ? " Secure;" : "";
  // SameSite=Lax (not Strict): OAuth callbacks are top-level GET navigations
  // and would lose the session under Strict.
  return `tb_session=${token}; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie() {
  return "tb_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}

type SessionRow = {
  userId: string;
  isAdmin: number | boolean | null;
  pending2fa: number | boolean | null;
  expiresAt: number;
};

async function sessionTableReady() {
  try {
    const { ensureDb } = await import("@/db");
    await ensureDb();
    return true;
  } catch {
    return false;
  }
}

export async function createSession(opts: {
  userId: string;
  isAdmin?: boolean;
  pending2fa?: boolean;
  ttlSeconds?: number;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const { ensureDb, getDb } = await import("@/db");
  const { sessions } = await import("@/db/schema");
  await ensureDb();
  const token = randomToken();
  const now = Math.floor(Date.now() / 1000);
  const ttl = opts.ttlSeconds ?? SESSION_TTL_SECONDS;
  await getDb().insert(sessions).values({
    id: crypto.randomUUID(),
    userId: opts.userId,
    tokenHash: await sha256(token),
    isAdmin: opts.isAdmin ? 1 : 0,
    pending2fa: opts.pending2fa ? 1 : 0,
    expiresAt: now + ttl,
    createdAt: now,
    lastSeenAt: now,
    ip: opts.ip ?? null,
    userAgent: opts.userAgent ?? null,
  });
  return token;
}

export async function getSessionByToken(token: string | undefined | null): Promise<SessionRow | null> {
  if (!token) return null;
  if (!(await sessionTableReady())) return null;
  try {
    const { getDb } = await import("@/db");
    const { sessions } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const [row] = await getDb()
      .select({ userId: sessions.userId, isAdmin: sessions.isAdmin, pending2fa: sessions.pending2fa, expiresAt: sessions.expiresAt })
      .from(sessions)
      .where(eq(sessions.tokenHash, await sha256(token)))
      .limit(1);
    if (!row || row.expiresAt < Math.floor(Date.now() / 1000)) return null;
    return row;
  } catch (error) {
    console.error("session lookup", error);
    return null;
  }
}

export async function finalizePendingSession(token: string, ttlSeconds = SESSION_TTL_SECONDS) {
  try {
    const { ensureDb, getDb } = await import("@/db");
    const { sessions } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    await ensureDb();
    const now = Math.floor(Date.now() / 1000);
    await getDb()
      .update(sessions)
      .set({ pending2fa: 0, expiresAt: now + ttlSeconds, lastSeenAt: now })
      .where(eq(sessions.tokenHash, await sha256(token)));
  } catch (error) {
    console.error("session finalize", error);
  }
}

export async function revokeSessionByToken(token: string | undefined | null) {
  if (!token) return;
  try {
    const { ensureDb, getDb } = await import("@/db");
    const { sessions } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    await ensureDb();
    await getDb().delete(sessions).where(eq(sessions.tokenHash, await sha256(token)));
  } catch (error) {
    console.error("session revoke", error);
  }
}

export async function revokeAllUserSessions(userId: string) {
  try {
    const { ensureDb, getDb } = await import("@/db");
    const { sessions } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    await ensureDb();
    await getDb().delete(sessions).where(eq(sessions.userId, userId));
  } catch (error) {
    console.error("sessions revoke all", error);
  }
}

// ---------------------------------------------------------------------------
// Identity — COOKIE ONLY. Platform-injected `oai-*` headers are intentionally
// NOT trusted here: any internet client can forge request headers, so
// accepting `oai-authenticated-user-id` as identity was an impersonation
// primitive (full cross-account read/write). Headers remain usable for UI
// display in chatgpt-auth.ts, never for data authorization.
// ---------------------------------------------------------------------------
function sessionTokenFromCookieHeader(request: Request) {
  return request.headers.get("cookie")?.match(/(?:^|;\s*)tb_session=([^;]+)/)?.[1];
}

export async function getUserIdFromSessionCookie(session: string | undefined | null) {
  if (!session) return null;
  const active = await getSessionByToken(session);
  // Pending-2FA sessions authenticate nothing until the code is verified.
  if (active && !active.pending2fa) {
    try {
      const { ensureDb, getDb } = await import("@/db");
      const { sessions } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");
      await ensureDb();
      await getDb()
        .update(sessions)
        .set({ lastSeenAt: Math.floor(Date.now() / 1000) })
        .where(eq(sessions.tokenHash, await sha256(session)));
    } catch {
      // best effort
    }
    return active.userId;
  }
  // Legacy fallback: deterministic pre-session tokens, so existing logins
  // survive the upgrade. New logins never mint these.
  if (process.env.ADMIN_PASSWORD && timingSafeEqual(session, await sha256(`trackbase:${process.env.ADMIN_PASSWORD}`)))
    return "trackbase-owner";
  try {
    const { ensureDb, getDb } = await import("@/db");
    const { users } = await import("@/db/schema");
    await ensureDb();
    const allUsers = await getDb().select({ id: users.id, passwordHash: users.passwordHash }).from(users);
    for (const u of allUsers) {
      if (timingSafeEqual(session, await sha256(`trackbase:${u.passwordHash}`))) return u.id;
    }
  } catch (error) {
    console.error("session users lookup", error);
  }
  return null;
}

export async function requestUserId(request: Request) {
  return getUserIdFromSessionCookie(sessionTokenFromCookieHeader(request));
}

// Aceita também sessões pendentes de 2FA — uso restrito aos endpoints de
// ativação do 2FA (setup/confirm), para o fluxo de 2FA obrigatório.
export async function requestUserIdAllowPending(request: Request) {
  const active = await getSessionByToken(sessionTokenFromCookieHeader(request));
  return active ? active.userId : null;
}

// ---------------------------------------------------------------------------
// Brute-force protection — DB-backed counters (work across instances) +
// per-account lockout fields on users.
// ---------------------------------------------------------------------------
export const LOGIN_FAIL_WINDOW_SECONDS = 600;
export const LOGIN_MAX_FAILS_PER_EMAIL = 8;
export const LOGIN_MAX_FAILS_PER_IP = 20;
export const ACCOUNT_LOCKOUT_ATTEMPTS = 8;
export const ACCOUNT_LOCKOUT_SECONDS = 900;

export function clientIpFromRequest(request: Request) {
  const values = (request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "").split(",").map(v => v.trim()).filter(Boolean);
  return values[0] || null;
}

export async function logLoginAttempt(email: string | null, ip: string | null, success: boolean) {
  try {
    const { ensureDb, getDb } = await import("@/db");
    const { loginAttempts } = await import("@/db/schema");
    await ensureDb();
    await getDb().insert(loginAttempts).values({
      id: crypto.randomUUID(),
      email: email?.toLowerCase() ?? null,
      ip,
      success: success ? 1 : 0,
      createdAt: Math.floor(Date.now() / 1000),
    });
  } catch (error) {
    console.error("login attempt log", error);
  }
}

export async function isLoginRateLimited(email: string | null, ip: string | null) {
  try {
    const { ensureDb, getDb } = await import("@/db");
    const { loginAttempts } = await import("@/db/schema");
    const { and, eq, gte } = await import("drizzle-orm");
    await ensureDb();
    const since = Math.floor(Date.now() / 1000) - LOGIN_FAIL_WINDOW_SECONDS;
    const db = getDb();
    if (email) {
      const rows = await db
        .select({ id: loginAttempts.id })
        .from(loginAttempts)
        .where(and(eq(loginAttempts.email, email.toLowerCase()), eq(loginAttempts.success, 0), gte(loginAttempts.createdAt, since)))
        .limit(LOGIN_MAX_FAILS_PER_EMAIL + 1);
      if (rows.length > LOGIN_MAX_FAILS_PER_EMAIL) return true;
    }
    if (ip) {
      const rows = await db
        .select({ id: loginAttempts.id })
        .from(loginAttempts)
        .where(and(eq(loginAttempts.ip, ip), eq(loginAttempts.success, 0), gte(loginAttempts.createdAt, since)))
        .limit(LOGIN_MAX_FAILS_PER_IP + 1);
      if (rows.length > LOGIN_MAX_FAILS_PER_IP) return true;
    }
    return false;
  } catch (error) {
    console.error("rate limit check", error);
    return false; // fail open on DB outage, lockout still applies per-account
  }
}

// ---------------------------------------------------------------------------
// CSRF — pragmatic Origin/Referer check for cookie-authenticated mutations.
// Blocks cross-site fetch/form attacks from modern browsers; never breaks
// legit same-origin or non-browser (bearer/webhook) clients: a mismatch is
// rejected, an absent header is allowed (curl, server-to-server, old UA).
// ---------------------------------------------------------------------------
export function hasConflictingOrigin(request: Request) {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return false;
  let host: string;
  try {
    host = new URL(request.url).host;
  } catch {
    return true;
  }
  for (const header of ["origin", "referer"] as const) {
    const value = request.headers.get(header);
    if (!value) continue;
    try {
      if (new URL(value).host !== host) return true;
    } catch {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// TOTP 2FA (RFC 6238, SHA-1, 30s step, 6 digits) — zero-dependency.
// ---------------------------------------------------------------------------
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateTotpSecret(bytes = 20) {
  const raw = crypto.getRandomValues(new Uint8Array(bytes));
  let out = "";
  let buffer = 0;
  let bitsLeft = 0;
  for (const byte of raw) {
    buffer = (buffer << 8) | byte;
    bitsLeft += 8;
    while (bitsLeft >= 5) {
      bitsLeft -= 5;
      out += BASE32_ALPHABET[(buffer >> bitsLeft) & 31];
    }
  }
  if (bitsLeft > 0) out += BASE32_ALPHABET[(buffer << (5 - bitsLeft)) & 31];
  return out;
}

function base32Decode(secret: string) {
  const clean = secret.trim().replaceAll("=", "").toUpperCase();
  const out: number[] = [];
  let buffer = 0;
  let bitsLeft = 0;
  for (const char of clean) {
    const val = BASE32_ALPHABET.indexOf(char);
    if (val < 0) throw new Error("invalid totp secret");
    buffer = (buffer << 5) | val;
    bitsLeft += 5;
    if (bitsLeft >= 8) {
      bitsLeft -= 8;
      out.push((buffer >> bitsLeft) & 255);
    }
  }
  return new Uint8Array(out);
}

async function hotpCode(secretBytes: Uint8Array<ArrayBuffer>, counter: number) {
  const key = await crypto.subtle.importKey("raw", secretBytes, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const msg = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    msg[i] = c & 255;
    c = Math.floor(c / 256);
  }
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg));
  const offset = mac[mac.length - 1] & 15;
  const code =
    ((mac[offset] & 127) << 24) | ((mac[offset + 1] & 255) << 16) | ((mac[offset + 2] & 255) << 8) | (mac[offset + 3] & 255);
  return String(code % 1000000).padStart(6, "0");
}

export async function verifyTotpCode(secret: string, code: string, window = 1) {
  const clean = String(code || "").replaceAll(/\s/g, "");
  if (!/^\d{6,8}$/.test(clean)) return false;
  try {
    const secretBytes = base32Decode(secret);
    const step = Math.floor(Date.now() / 30000);
    for (let drift = -window; drift <= window; drift++) {
      if (timingSafeEqual(await hotpCode(secretBytes, step + drift), clean)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function totpAuthUrl(secret: string, account: string, issuer = "GhostScale") {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(issuer)}&digits=6&period=30`;
}

// ---------------------------------------------------------------------------
// Admin isolation helpers
// ---------------------------------------------------------------------------
export function adminPanelPath() {
  const raw = (process.env.ADMIN_PANEL_PATH || "").trim();
  if (!raw) return "/837388318admin";
  return raw.startsWith("/") ? raw : `/${raw}`;
}

export async function isAdminUserId(userId: string | null) {
  if (!userId) return false;
  if (userId === "trackbase-owner") return true;
  try {
    const { ensureDb, getDb } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    await ensureDb();
    const [row] = await getDb().select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
    return row?.role === "admin";
  } catch (error) {
    console.error("admin role lookup", error);
    return false;
  }
}

export function logAdminAccess(event: string, detail: Record<string, unknown> = {}) {
  const entry = { scope: "admin-panel", event, at: new Date().toISOString(), ...detail };
  console.warn(JSON.stringify(entry));
  const webhook = (process.env.ADMIN_ALERT_WEBHOOK || "").trim();
  if (webhook && (event === "login-failed" || event === "path-mismatch")) {
    fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(entry),
    }).catch(() => {});
  }
}
