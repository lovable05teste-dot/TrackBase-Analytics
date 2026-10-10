import { timingSafeEqual } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { metaAccounts, metaLinked } from "@/db/schema";

const b64 = (v: string) => Buffer.from(v.replace(/-/g, "+").replace(/_/g, "/"), "base64");

// Valida o signed_request que a Meta envia (HMAC-SHA256 com o App Secret).
export async function parseSignedRequest(signed: string, secret = process.env.META_APP_SECRET?.trim() || ""): Promise<{ user_id?: string } | null> {
  const [sig, payload] = String(signed || "").split(".");
  if (!sig || !payload || !secret) return null;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = Buffer.from(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
  const given = b64(sig);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(b64(payload).toString("utf8")) as { algorithm?: string; user_id?: string };
    return data.algorithm?.toUpperCase() === "HMAC-SHA256" ? data : null;
  } catch {
    return null;
  }
}

export async function signedRequestFrom(request: Request) {
  const text = await request.text();
  const value = new URLSearchParams(text).get("signed_request") || "";
  return parseSignedRequest(value);
}

// Apaga da GhostScale as contas de anúncios e tokens trazidos por esse
// usuário do Facebook. Retorna quantas contas foram removidas.
export async function deleteMetaUserData(metaUserId: string) {
  await ensureDb();
  const db = getDb();
  const rows = await db.select({ userId: metaAccounts.userId, adAccountId: metaAccounts.adAccountId }).from(metaAccounts).where(eq(metaAccounts.metaUserId, metaUserId));
  for (const row of rows) await db.delete(metaLinked).where(and(eq(metaLinked.userId, row.userId), eq(metaLinked.adAccountId, row.adAccountId)));
  if (rows.length) await db.delete(metaAccounts).where(and(eq(metaAccounts.metaUserId, metaUserId), inArray(metaAccounts.adAccountId, rows.map((r) => r.adAccountId))));
  return rows.length;
}
