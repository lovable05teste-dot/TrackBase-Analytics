import { clearSessionCookies, requestSessionTokens, revokeSessionByToken } from "@/lib/trackbase-security";

// Revoga TODOS os tb_session recebidos e apaga as duas variantes do cookie
// (domínio e host-only), senão uma sobra e o logout/login seguinte falha.
async function logout(request: Request, headers: Headers) {
  for (const token of requestSessionTokens(request)) await revokeSessionByToken(token);
  for (const cookie of clearSessionCookies()) headers.append("set-cookie", cookie);
  return headers;
}

export async function GET(request: Request) {
  const headers = await logout(request, new Headers({ location: new URL("/login", request.url).toString() }));
  return new Response(null, { status: 302, headers });
}

export async function POST(request: Request) {
  const headers = await logout(request, new Headers({ "content-type": "application/json" }));
  return new Response(JSON.stringify({ ok: true }), { headers });
}
