// Datas no fuso de Brasília (America/Sao_Paulo, UTC-3 o ano todo desde 2019).
// O servidor da Vercel roda em UTC: sem isso "Hoje" virava o dia às 21h e os
// gráficos por hora saíam 3h adiantados.
const OFFSET_MS = 3 * 3600 * 1000;

export function brYmd(ms = Date.now()) {
  return new Date(ms - OFFSET_MS).toISOString().slice(0, 10);
}

export function brHour(seconds: number) {
  return new Date(seconds * 1000 - OFFSET_MS).getUTCHours();
}

export function brDayStart(ymd: string) {
  return Math.floor(Date.parse(`${ymd}T00:00:00-03:00`) / 1000);
}

export function addDays(ymd: string, days: number) {
  return new Date(Date.parse(`${ymd}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}

// Período nomeado → dias (inclusive) em Brasília. null = sem limite.
export function presetDays(preset: string, today = brYmd()): { since: string; until: string } | null {
  if (preset === "today") return { since: today, until: today };
  if (preset === "yesterday") { const d = addDays(today, -1); return { since: d, until: d }; }
  if (preset === "last_7d") return { since: addDays(today, -6), until: today };
  if (preset === "last_30d") return { since: addDays(today, -29), until: today };
  if (preset === "this_month") return { since: today.slice(0, 8) + "01", until: today };
  if (preset === "last_month") {
    const firstThis = today.slice(0, 8) + "01";
    const lastPrev = addDays(firstThis, -1);
    return { since: lastPrev.slice(0, 8) + "01", until: lastPrev };
  }
  return null;
}

export function isYmd(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
}

// Intervalo em segundos (início do 1º dia até o fim do último, sem passar de agora).
export function daysToUnix(d: { since: string; until: string }, now = Math.floor(Date.now() / 1000)) {
  return { start: brDayStart(d.since), end: Math.min(now, brDayStart(d.until) + 86399) };
}
