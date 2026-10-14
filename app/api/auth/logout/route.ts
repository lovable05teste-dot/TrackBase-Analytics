import { clearSessionCookies, requestSessionTokens, revokeSessionByToken, hasConflictingOrigin } from "@/lib/trackbase-security";

// Revoga TODOS os tb_session recebidos e apaga as duas variantes do cookie
// (domínio e host-only), senão uma sobra e o logout/login seguinte falha.
async function logout(request: Request, headers: Headers) {
  for (const token of requestSessionTokens(request)) await revokeSessionByToken(token);
  for (const cookie of clearSessionCookies()) headers.append("set-cookie", cookie);
  return headers;
}

export async function GET(request: Request) {
  const headers = await logout(request, new Headers({ location: new URL("/login", request.url).toString(), "cache-control": "no-store" }));
  return new Response(null, { status: 302, headers });
}

export async function POST(request: Request) {if (hasConflictingOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const headers = await logout(request, new Headers({ "content-type": "application/json", "cache-control": "no-store" }));
  return new Response(JSON.stringify({ ok: true }), { headers });
}
