const BOT_UA = /(bot|crawl|spider|slurp|mediapartners|baidu|yandex|sogou|exabot|facebot|ia_archiver|semrush|ahrefs|mj12bot|dotbot|petal|bytespider|gptbot|ccbot|claudebot|perplexity|facebookexternalhit|adsbot|googlebot|bingbot|duckduckbot|-headless|phantomjs|selenium|puppeteer|playwright)/i;

export function isBotUa(ua: string | null | undefined): boolean {
  if (!ua) return false;
  return BOT_UA.test(ua);
}

export function extractClientIp(request: Request): string | null {
  const raw =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for") ||
    "";
  const first = raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)[0];
  return first || null;
}

export function normalizeIp(ip: string): string {
  return ip.trim().toLowerCase();
}
