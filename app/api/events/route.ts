import { and, eq } from "drizzle-orm";
import { ensureDb, getDb } from "../../../db";
import { blockedIps, events, projects } from "../../../db/schema";
import { extractClientIp, isBotUa, normalizeIp } from "../../../lib/fraud";
import { decryptSecret } from "../../../lib/trackbase-security";
import {parseTrackingConfig} from "../../../lib/tracking-config";

const allowed = new Set(["AdClick","PageView","PageError","ViewContent","AddToCart","InitiateCheckout","Purchase","Lead","Click","Scroll"]);
const CAPI_EVENTS = new Set(["PageView","ViewContent","AddToCart","InitiateCheckout","Purchase","Lead"]);
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type", "Access-Control-Allow-Methods": "POST,OPTIONS" };
export function OPTIONS() { return new Response(null, { status: 204, headers: cors }); }
async function hash(value:unknown,phone=false){const raw=String(value||"").trim().toLocaleLowerCase(),normalized=phone?raw.replace(/\D/g,""):raw.replace(/\s+/g,"");if(!normalized)return undefined;const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(normalized));return Array.from(new Uint8Array(bytes)).map(byte=>byte.toString(16).padStart(2,"0")).join("")}
function clientIp(request:Request,mode:"auto"|"ipv4"|"disabled"){if(mode==="disabled")return undefined;const values=(request.headers.get("cf-connecting-ip")||request.headers.get("x-forwarded-for")||"").split(",").map(v=>v.trim()).filter(Boolean);return mode==="ipv4"?values.find(v=>/^\d{1,3}(\.\d{1,3}){3}$/.test(v)):values[0]}

export async function POST(request: Request) {
  try {
    await ensureDb();
    const body = await request.json() as Record<string, unknown>;
    const key = String(body.projectKey || "");
    const eventName = String(body.eventName || "");
    if (eventName === "Purchase") return Response.json({ error: "Compra deve ser confirmada pelo webhook de pagamento" }, { status: 400, headers: cors });
    if (!key || !allowed.has(eventName)) return Response.json({ error: "Evento inválido" }, { status: 400, headers: cors });
    const [project] = await getDb().select().from(projects).where(eq(projects.publicKey, key)).limit(1);
    if (!project) return Response.json({ error: "Projeto inválido" }, { status: 404, headers: cors });
    const ua = request.headers.get("user-agent") || "";
    const ip = extractClientIp(request);
    const recordInvalid = async (reason: string) => {
      try {
        await getDb().insert(events).values({
          id: crypto.randomUUID(), projectId: project.id, eventId: `invalid_${Date.now()}_${Math.random().toString(16).slice(2)}`, eventName: "InvalidTraffic", source: "filter",
          occurredAt: Math.floor(Date.now() / 1000), visitorId: String(body.visitorId || ""),
          fbclid: null, fbp: null, fbc: null,
          utmSource: null, utmCampaign: null, utmMedium: null, utmContent: null, utmTerm: null,
          value: 0, currency: "BRL", payload: JSON.stringify({ reason, ip: ip || null, ua: ua.slice(0, 160) || null })
        }).onConflictDoNothing();
      } catch {}
      return Response.json({ received: true, filtered: reason }, { headers: cors });
    };
    if (isBotUa(ua)) return recordInvalid("bot");
    if (ip) {
      const [blocked] = await getDb().select({ id: blockedIps.id }).from(blockedIps).where(and(eq(blockedIps.workspaceId, project.workspaceId), eq(blockedIps.ip, normalizeIp(ip)))).limit(1);
      if (blocked) return recordInvalid("blocklisted");
    }
    const eventId = String(body.eventId || crypto.randomUUID());
    const now = Math.floor(Date.now()/1000);
    const url = String(body.url || "");
    const u = url ? new URL(url) : null;
    const attribution=(body.attribution&&typeof body.attribution==="object"?body.attribution:{}) as Record<string,unknown>;
    const utm=(name:string)=>u?.searchParams.get(name)||String(attribution[name]||"")||null;
    const value = Number(body.value || 0);
    const safeBody={...body,email:body.email?"[HASHED]":undefined,phone:body.phone?"[HASHED]":undefined};
    await getDb().insert(events).values({
      id: crypto.randomUUID(), projectId: project.id, eventId, eventName, source: "browser",
      occurredAt: Number(body.eventTime || now), visitorId: String(body.visitorId || ""),
      fbclid: String(body.fbclid || attribution.fbclid || ""), fbp: String(body.fbp || ""), fbc: String(body.fbc || ""),
      utmSource:utm("utm_source"),utmCampaign:utm("utm_campaign"),utmMedium:utm("utm_medium"),utmContent:utm("utm_content"),utmTerm:utm("utm_term"),
      value,currency:String(body.currency||"BRL"),payload:JSON.stringify(safeBody)
    }).onConflictDoNothing();
    let capi: unknown = null;
    if (CAPI_EVENTS.has(eventName) && project.pixelId && project.metaTokenCipher && project.metaTokenIv) {
      const token = await decryptSecret(project.metaTokenCipher, project.metaTokenIv),config=parseTrackingConfig(project.trackingConfig);
      const payload: Record<string, unknown> = { data: [{ event_name: eventName, event_time: Number(body.eventTime || now), event_id: eventId, action_source: "website", event_source_url: url, user_data: { client_ip_address: clientIp(request,config.ipMode), client_user_agent: request.headers.get("user-agent") || "", fbp: body.fbp || undefined, fbc: body.fbc || undefined, em:await hash(body.email),ph:await hash(body.phone,true) }, custom_data: { value, currency: String(body.currency || "BRL"), content_ids: body.contentIds || undefined, content_name: body.contentName || undefined, content_type: "product",order_id:body.externalId||undefined } }] };
      if (project.metaTestCode) payload.test_event_code = project.metaTestCode;
      const result = await fetch(`https://graph.facebook.com/v25.0/${project.pixelId}/events?access_token=${encodeURIComponent(token)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      capi = { ok: result.ok, status: result.status };
    }
    return Response.json({ received: true, eventId, capi }, { headers: cors });
  } catch {
    return Response.json({ error: "Não foi possível registrar o evento" }, { status: 400, headers: cors });
  }
}
