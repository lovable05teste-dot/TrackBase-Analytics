const PUBLIC_APP_HOSTS = new Set(["ghostscale.com.br", "www.ghostscale.com.br"]);

export function metaStateOrigin(state: string): string | null {
  // The random prefix contains no dots; the rest is the complete hostname.
  const separator = state.indexOf(".");
  if (separator < 1) return null;
  const host = state.slice(separator + 1).toLowerCase();
  return PUBLIC_APP_HOSTS.has(host) ? `https://${host}` : null;
}
