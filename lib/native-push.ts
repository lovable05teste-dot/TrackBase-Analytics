import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { nativePushTokens, soundPrefs } from "@/db/schema";
import { parseSoundPrefs, SALE_SOUND_IDS } from "@/lib/sound-prefs";

// Push do app nativo (iPhone/Android) via Expo. Diferente do push do
// navegador, aqui o som escolhido toca com o app fechado: os arquivos de som
// vão dentro do app e cada som tem um canal próprio no Android.
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export function isExpoToken(token: string) {
  return /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(token);
}

export function nativeSound(selected: string) {
  return selected && selected !== "none" && SALE_SOUND_IDS.has(selected) ? selected : null;
}

type ExpoTicket = { status: "ok" | "error"; message?: string; details?: { error?: string } };

export async function sendNativePush(workspaceId: string, payload: { title: string; body: string; url?: string; tag?: string }) {
  const result = { tokens: 0, sent: 0, failed: 0, errors: [] as string[] };
  const db = getDb();
  const rows = await db.select().from(nativePushTokens).where(eq(nativePushTokens.workspaceId, workspaceId));
  result.tokens = rows.length;
  if (!rows.length) return result;
  const [pref] = await db.select().from(soundPrefs).where(eq(soundPrefs.workspaceId, workspaceId)).limit(1);
  const sp = parseSoundPrefs(pref?.prefs);
  // Som desligado no painel = som padrão do celular (não silencioso).
  const sound = sp.enabled ? nativeSound(sp.selected) : null;
  const messages = rows.map((r) => ({
    to: r.token,
    title: payload.title,
    body: payload.body,
    data: { url: payload.url || "/vendas", tag: payload.tag || "" },
    priority: "high",
    // iOS: arquivo dentro do app; Android: o som é do canal.
    sound: sound ? `${sound}.wav` : "default",
    channelId: sound ? `venda_${sound}` : "vendas",
  }));
  // A Expo aceita no máximo 100 mensagens por requisição.
  const dead: string[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    try {
      const response = await fetch(EXPO_PUSH_URL, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(batch), signal: AbortSignal.timeout(8000) });
      const body = (await response.json().catch(() => ({}))) as { data?: ExpoTicket[]; errors?: { message?: string }[] };
      if (!response.ok || !Array.isArray(body.data)) {
        result.failed += batch.length;
        result.errors.push(body.errors?.[0]?.message || `HTTP ${response.status}`);
        continue;
      }
      body.data.forEach((ticket, j) => {
        if (ticket.status === "ok") return void result.sent++;
        result.failed++;
        result.errors.push(ticket.details?.error || ticket.message || "erro");
        if (ticket.details?.error === "DeviceNotRegistered") dead.push(batch[j].to);
      });
    } catch (e) {
      result.failed += batch.length;
      result.errors.push(e instanceof Error ? e.message.slice(0, 120) : "erro");
    }
  }
  if (dead.length) await db.delete(nativePushTokens).where(inArray(nativePushTokens.token, dead)).catch(() => {});
  return result;
}
