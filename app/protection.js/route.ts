import { and, eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { projects, siteProtections } from "@/db/schema";
import { parseProtection, protectionScript } from "@/lib/protection";

export async function GET(request: Request) {
  const headers = { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*", "X-Content-Type-Options": "nosniff" };
  try {
    const key = new URL(request.url).searchParams.get("key") || "";
    if (!key || key.length > 200) return new Response("/* Chave do projeto necessária. */", { status: 400, headers });
    await ensureDb();
    const [row] = await getDb().select({ domain: projects.domain, config: siteProtections.config }).from(projects).leftJoin(siteProtections, and(eq(siteProtections.projectId, projects.id), eq(siteProtections.workspaceId, projects.workspaceId))).where(eq(projects.publicKey, key)).limit(1);
    if (!row) return new Response("/* Projeto não encontrado. */", { status: 404, headers });
    return new Response(protectionScript(parseProtection(row.config, row.domain), key, new URL("/api/events", request.url).toString()), { headers });
  } catch { return new Response("console.warn('GhostScale: proteção temporariamente indisponível.');", { status: 503, headers }); }
}
