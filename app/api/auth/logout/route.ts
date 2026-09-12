import { clearSessionCookie, revokeSessionByToken } from "@/lib/trackbase-security";

export async function GET(request: Request) {
  const cookie = request.headers.get("cookie")?.match(/(?:^|;\s*)tb_session=([^;]+)/)?.[1];
  await revokeSessionByToken(cookie);
  return new Response(null, {
    status: 302,
    headers: { location: new URL("/login", request.url).toString(), "set-cookie": clearSessionCookie() },
  });
}

export async function POST(request: Request) {
  const cookie = request.headers.get("cookie")?.match(/(?:^|;\s*)tb_session=([^;]+)/)?.[1];
  await revokeSessionByToken(cookie);
  return Response.json({ ok: true }, { headers: { "set-cookie": clearSessionCookie() } });
}
