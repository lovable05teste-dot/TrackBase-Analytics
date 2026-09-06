import { env } from "cloudflare:workers";

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

async function encryptionKey() {
  const secret = (env as unknown as { TRACKBASE_ENCRYPTION_KEY?: string }).TRACKBASE_ENCRYPTION_KEY;
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

export async function requestUserId(request: Request) {
  return request.headers.get("oai-authenticated-user-id");
}
