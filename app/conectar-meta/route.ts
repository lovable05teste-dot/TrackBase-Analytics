import { requestUserId } from "@/lib/trackbase-security";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const userId = await requestUserId(request);
  const destination = userId
    ? new URL("/api/meta/oauth/start", origin)
    : new URL("/login?return_to=%2Fconectar-meta", origin);

  return new Response(null, {
    status: 302,
    headers: {
      Location: destination.toString(),
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Referrer-Policy": "no-referrer",
    },
  });
}
