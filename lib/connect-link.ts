import { and, eq, gte } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { metaConnectLinks } from "@/db/schema";
import { sha256 } from "@/lib/trackbase-security";

// Link de conexão (multilogin/AdsPower): ?t=<token> gerado no painel. Serve
// para Meta e TikTok. Conecta a conta sem login da GhostScale no navegador.
export async function userFromConnectLink(request: Request) {
  const t = new URL(request.url).searchParams.get("t") || "";
  if (!/^[A-Za-z0-9_-]{32,80}$/.test(t)) return null;
  await ensureDb();
  const [row] = await getDb().select({ userId: metaConnectLinks.userId }).from(metaConnectLinks).where(and(eq(metaConnectLinks.tokenHash, await sha256(t)), gte(metaConnectLinks.expiresAt, Math.floor(Date.now() / 1000)))).limit(1);
  return row?.userId ?? null;
}

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!domain) return "";
  return `${user.slice(0, 2)}${"•".repeat(Math.max(2, Math.min(6, user.length - 2)))}@${domain}`;
}

// Tela de confirmação antes de abrir a autorização: mostra a qual conta da
// GhostScale as contas de anúncio vão ser ligadas (evita alguém mandar o
// próprio link para outra pessoa e receber as contas dela). HTML puro, sem
// cookies nem Analytics.
export async function connectLinkConfirmation(request: Request, userId: string, platform: "meta" | "tiktok") {
  const url = new URL(request.url);
  if (url.searchParams.get("ok") === "1") return null;
  let email = "";
  try {
    const { users } = await import("@/db/schema");
    const [row] = await getDb().select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
    email = row?.email ? maskEmail(row.email) : "";
  } catch {}
  url.searchParams.set("ok", "1");
  const alt = new URL(url);
  alt.searchParams.set("modo", "classico");
  const net = platform === "tiktok" ? "TikTok" : "Facebook";
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Conectar à GhostScale</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#080b12;color:#e2e8f0;font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:16px;box-sizing:border-box}main{max-width:440px;border:1px solid #1e293b;border-radius:16px;padding:28px 24px;background:#0f1420}h1{font-size:20px;margin:0 0 8px}p{color:#94a3b8;margin:0 0 14px}b{color:#e2e8f0}a.btn{display:block;text-align:center;background:linear-gradient(90deg,#7c3aed,#3b82f6);color:#fff;text-decoration:none;font-weight:600;border-radius:10px;padding:12px 16px;margin-top:18px}small{display:block;margin-top:14px;color:#64748b;font-size:12px}</style></head><body><main><h1>Conectar contas de anúncio</h1><p>Você vai entrar no ${net} e autorizar as contas de anúncio deste perfil para a conta GhostScale${email ? ` <b>${esc(email)}</b>` : ""}.</p><p>Só continue se essa conta GhostScale for sua ou da sua equipe.</p><a class="btn" href="${esc(url.pathname + url.search)}">Continuar no ${net}</a>${platform === "meta" ? `<a href="${esc(alt.pathname + alt.search)}" style="display:block;text-align:center;margin-top:12px;color:#93c5fd;font-size:14px">Deu "Recurso indisponível"? Tente o login alternativo</a>` : ""}<small>Se você não pediu este link, feche esta aba.</small></main></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "referrer-policy": "no-referrer", "x-robots-tag": "noindex" } });
}
