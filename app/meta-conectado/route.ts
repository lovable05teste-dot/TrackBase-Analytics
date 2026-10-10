// Página final do link de conexão (AdsPower). É HTML puro de propósito:
// sem layout do app, sem Analytics, sem service worker e sem cookies, para
// não deixar rastro da GhostScale no perfil do navegador.
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  link: "Este link de conexão expirou ou foi substituído. Gere um novo na GhostScale, em Contas Meta.",
  cancelado: "A autorização foi cancelada no Facebook. Abra o link de novo para tentar outra vez.",
  sessao: "A autorização expirou ou já foi usada. Abra o link de conexão de novo.",
  sem_contas: "O Facebook não retornou contas de anúncios para este perfil.",
  oauth: "Não foi possível concluir a conexão. Abra o link de novo.",
  retorno: "O retorno do Facebook veio incompleto. Abra o link de novo.",
  config: "A conexão com a Meta ainda não está configurada na GhostScale.",
  start: "Não foi possível iniciar a conexão. Abra o link de novo.",
};

export function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const erro = p.get("erro");
  const contas = Number(p.get("contas") || 0);
  const ok = !erro && p.get("conectado") === "1";
  const title = ok ? "Conta Meta conectada" : "Não foi possível conectar";
  const text = ok
    ? `${contas > 0 ? `${contas} conta(s) de anúncios autorizada(s). ` : ""}Volte para a GhostScale e vincule as contas em Contas Meta. Pode fechar esta aba.`
    : ERRORS[erro || ""] || "Não foi possível conectar. Abra o link de novo.";
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#080b12;color:#e2e8f0;font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:16px;box-sizing:border-box}main{max-width:420px;text-align:center;border:1px solid #1e293b;border-radius:16px;padding:28px 22px;background:#0f1420}.i{font-size:40px}h1{font-size:20px;margin:10px 0 6px}p{color:#94a3b8;margin:0}</style></head><body><main><div class="i">${ok ? "✅" : "⚠️"}</div><h1>${title}</h1><p>${text}</p></main></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "referrer-policy": "no-referrer", "x-robots-tag": "noindex" } });
}
