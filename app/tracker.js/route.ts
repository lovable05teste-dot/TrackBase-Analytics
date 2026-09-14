import { and, eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { projects, siteProtections } from "@/db/schema";
import { parseTrackingConfig } from "@/lib/tracking-config";
import { parseProtection, protectionScript } from "@/lib/protection";
import { trackerScript } from "@/lib/tracker-script";
export async function GET(request: Request) {
  const headers = { "content-type": "application/javascript; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*", "x-content-type-options": "nosniff" };
  const key = new URL(request.url).searchParams.get("key") || "";
  if (!key || key.length > 200) return new Response("/* Chave do projeto necessária. */", { status: 400, headers });
  try {
    await ensureDb();
    const [project] = await getDb().select({ pixelId: projects.pixelId, trackingConfig: projects.trackingConfig, domain: projects.domain, protection: siteProtections.config }).from(projects).leftJoin(siteProtections, and(eq(siteProtections.projectId, projects.id), eq(siteProtections.workspaceId, projects.workspaceId))).where(eq(projects.publicKey, key)).limit(1);
    if (!project) return new Response("/* Projeto não encontrado. */", { status: 404, headers });
    const endpoint = new URL("/api/events", request.url).toString();
    const script = protectionScript(parseProtection(project.protection, project.domain), key, endpoint) + "\n" + trackerScript(key, endpoint, project.pixelId || "", parseTrackingConfig(project.trackingConfig));
    return new Response(script, { headers });
  } catch { return new Response("console.warn('GhostScale: tracker temporariamente indisponível.');", { status: 503, headers }); }
}
