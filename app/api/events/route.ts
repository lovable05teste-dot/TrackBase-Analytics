import { eq } from "drizzle-orm";
import { ensureDb, getDb } from "../../../db";
import { events, projects } from "../../../db/schema";
import { decryptSecret } from "../../../lib/trackbase-security";

const allowed = new Set(["AdClick","PageView","PageError","ViewContent","AddToCart","InitiateCheckout","Purchase","Lead"]);
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type", "Access-Control-Allow-Methods": "POST,OPTIONS" };
export function OPTIONS() { return new Response(null, { status: 204, headers: cors }); }

export async function POST(request: Request) {
  try {
    await ensureDb();
    const body = await request.json() as Record<string, unknown>;
    const key = String(body.projectKey || "");
    const eventName = String(body.eventName || "");
    if (!key || !allowed.has(eventName)) return Response.json({ error: "Evento inválido" }, { status: 400, headers: cors });
    const [project] = await getDb().select().from(projects).where(eq(projects.publicKey, key)).limit(1);
    if (!project) return Response.json({ error: "Projeto inválido" }, { status: 404, headers: cors });
    const eventId = String(body.eventId || crypto.randomUUID());
    const now = Math.floor(Date.now()/1000);
    const url = String(body.url || "");
    const u = url ? new URL(url) : null;
    const value = Number(body.value || 0);
    await getDb().insert(events).values({
      id: crypto.randomUUID(), projectId: project.id, eventId, eventName, source: "browser",
      occurredAt: Number(body.eventTime || now), visitorId: String(body.visitorId || ""),
      fbclid: String(body.fbclid || ""), fbp: String(body.fbp || ""), fbc: String(body.fbc || ""),
      utmSource: u?.searchParams.get("utm_source"), utmCampaign: u?.searchParams.get("utm_campaign"),
      utmMedium: u?.searchParams.get("utm_medium"), utmContent: u?.searchParams.get("utm_content"),
      utmTerm: u?.searchParams.get("utm_term"), value, currency: String(body.currency || "BRL"),
      payload: JSON.stringify(body)
    }).onConflictDoNothing();
    let capi: unknown = null;
    if (project.pixelId && project.metaTokenCipher && project.metaTokenIv) {
      const token = await decryptSecret(project.metaTokenCipher, project.metaTokenIv);
      const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "";
      const payload: Record<string, unknown> = { data: [{ event_name: eventName, event_time: Number(body.eventTime || now), event_id: eventId, action_source: "website", event_source_url: url, user_data: { client_ip_address: ip, client_user_agent: request.headers.get("user-agent") || "", fbp: body.fbp || undefined, fbc: body.fbc || undefined }, custom_data: { value, currency: String(body.currency || "BRL"), content_ids: body.contentIds || undefined, content_name: body.contentName || undefined, content_type: "product" } }] };
      if (project.metaTestCode) payload.test_event_code = project.metaTestCode;
      const result = await fetch(`https://graph.facebook.com/v25.0/${project.pixelId}/events?access_token=${encodeURIComponent(token)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      capi = { ok: result.ok, status: result.status };
    }
    return Response.json({ received: true, eventId, capi }, { headers: cors });
  } catch {
    return Response.json({ error: "Não foi possível registrar o evento" }, { status: 400, headers: cors });
  }
}
