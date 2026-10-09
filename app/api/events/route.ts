import { and, desc, eq, inArray } from "drizzle-orm";
import { after } from "next/server";
import { ensureDb, getDb } from "../../../db";
import { events, projects, siteProtections, protectionReports } from "../../../db/schema";
import { decryptSecret, requestUserId, sha256 } from "../../../lib/trackbase-security";
import {parseTrackingConfig} from "../../../lib/tracking-config";
import { domainAllowed, parseProtection } from "@/lib/protection";
import { parseBlockedIps, requestIp } from "@/lib/protection-ip";
import { isBotUserAgent } from "@/lib/bot-filter";

const allowed = new Set(["AdClick","PageView","PageError","ViewContent","AddToCart","InitiateCheckout","Purchase","Lead","SecurityCheck","SecurityViolation","SecurityRecovery"]);
const internalOnly = new Set(["AdClick","PageError"]);
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type", "Access-Control-Allow-Methods": "POST,OPTIONS" };
export function OPTIONS() { return new Response(null, { status: 204, headers: cors }); }
async function hash(value:unknown,phone=false){const raw=String(value||"").trim().toLocaleLowerCase(),normalized=phone?raw.replace(/\D/g,""):raw.replace(/\s+/g,"");if(!normalized)return undefined;const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(normalized));return Array.from(new Uint8Array(bytes)).map(byte=>byte.toString(16).padStart(2,"0")).join("")}
function clientIp(request:Request,mode:"auto"|"ipv4"|"disabled"){if(mode==="disabled")return undefined;const values=(request.headers.get("cf-connecting-ip")||request.headers.get("x-forwarded-for")||"").split(",").map(v=>v.trim()).filter(Boolean);return mode==="ipv4"?values.find(v=>/^\d{1,3}(\.\d{1,3}){3}$/.test(v)):values[0]}

export async function POST(request: Request) {
  try {
    await ensureDb();
    const raw = await request.text();
    if (raw.length > 32768) return Response.json({ error: "Evento muito grande" }, { status: 413, headers: cors });
    const body = JSON.parse(raw) as Record<string, unknown>;
    const key = String(body.projectKey || "");
    const eventName = String(body.eventName || "");
    if (eventName === "Purchase") return Response.json({ error: "Compra deve ser confirmada pelo webhook de pagamento" }, { status: 400, headers: cors });
    if (!key || !allowed.has(eventName)) return Response.json({ error: "Evento inválido" }, { status: 400, headers: cors });
    const [project] = await getDb().select().from(projects).where(eq(projects.publicKey, key)).limit(1);
    if (!project) return Response.json({ error: "Projeto inválido" }, { status: 404, headers: cors });
    const [protectionRow] = await getDb().select().from(siteProtections).where(and(eq(siteProtections.projectId, project.id), eq(siteProtections.workspaceId, project.workspaceId))).limit(1);
    const protection = parseProtection(protectionRow?.config, project.domain);
    const incomingIp = requestIp(request);
    if (incomingIp && parseBlockedIps(protectionRow?.blockedIps).includes(incomingIp)) return Response.json({ received: false, ignored: true, reason: "excluded_ip" }, { headers: cors });
    const eventId = String(body.eventId || crypto.randomUUID());
    const now = Math.floor(Date.now()/1000);
    const url = String(body.url || "");
    const u = url ? new URL(url) : null;
    if (!u || !["https:", "http:"].includes(u.protocol)) return Response.json({ error: "URL do evento inválida" }, { status: 400, headers: cors });
    if (eventName === "SecurityCheck" || eventName === "SecurityViolation" || eventName === "SecurityRecovery") {
      if (!protection.enabled) return new Response(null, { status: 204, headers: cors });
      const host = u.hostname.toLowerCase().replace(/\.$/, "");
      const reason = !domainAllowed(host, protection) ? "domain" : body.reason === "frame" ? "frame" : "allowed";
      // Diagnóstico do navegador, agregado por hora; nunca é enviado à Meta.
      const reportedName = eventName === "SecurityRecovery" && reason === "domain" && protection.recoveryEnabled ? "SecurityRecovery" : reason === "allowed" ? "SecurityCheck" : "SecurityViolation";
      const reportMode = reportedName === "SecurityRecovery" ? "recover" : protection.mode;
      const reportId = "security_" + await sha256(`${project.id}:${host}:${reason}:${reportMode}:${Math.floor(now / 3600)}`);
      await getDb().insert(protectionReports).values({ id: reportId, projectId: project.id, eventName: reportedName, occurredAt: now, payload: JSON.stringify({ host, reason, mode: reportMode }) }).onConflictDoNothing();
      // Clone detectado (domínio fora da lista): avisa no celular 1x por dia
      // por domínio. O id determinístico garante que só a 1ª visita do dia avisa.
      if (reason === "domain") {
        const alertId = "clonealert_" + await sha256(`${project.id}:${host}:${Math.floor(now / 86400)}`);
        const fresh = await getDb().insert(protectionReports).values({ id: alertId, projectId: project.id, eventName: "CloneAlert", occurredAt: now, payload: JSON.stringify({ host }) }).onConflictDoNothing().returning({ id: protectionReports.id });
        if (fresh.length) {
          const { pushToWorkspace } = await import("@/lib/push");
          await pushToWorkspace(project.workspaceId, { title: "⚠️ Clone da sua página detectado", body: `${host} está usando a sua página (${project.name}). ${protection.mode === "block" ? "Visitas bloqueadas." : protection.recoveryEnabled ? "Visitas enviadas para a página oficial." : "Ative o bloqueio em Anti-clone."}`, url: "/seguranca/anti-clone", tag: `tb-clone-${host}` }).catch(() => null);
        }
      }
      return Response.json({ received: true }, { headers: cors });
    }
    if (protection.enabled && protection.mode === "block") {
      const origin = request.headers.get("origin");
      if (!domainAllowed(u.hostname, protection) || (origin && (origin === "null" || !domainAllowed(new URL(origin).hostname, protection)))) return Response.json({ error: "Domínio não autorizado para este projeto" }, { status: 403, headers: cors });
    }
    // Robôs (prévia/revisão da Meta, buscadores, automação) não viram acesso,
    // clique nem evento na CAPI. Depois da proteção: clone continua 403.
    if (isBotUserAgent(request.headers.get("user-agent"))) return Response.json({ received: false, ignored: true, reason: "bot" }, { headers: cors });
    if (eventId.length > 200) return Response.json({ error: "Identificador de evento inválido" }, { status: 400, headers: cors });
    const attribution=(body.attribution&&typeof body.attribution==="object"?body.attribution:{}) as Record<string,unknown>;
    const utm=(name:string)=>u?.searchParams.get(name)||String(attribution[name]||"")||null;
    // Horário vem do navegador: relógio errado gerava event_time no futuro ou
    // >7 dias, que a Meta rejeita. Fora da janela aceitável, usa o do servidor.
    const clientTime = Number(body.eventTime);
    const eventTime = Number.isFinite(clientTime) && clientTime <= now + 300 && clientTime >= now - 86400 ? Math.floor(clientTime) : now;
    const value = Number(body.value || 0);
    if (!Number.isFinite(value) || value < 0) return Response.json({ error: "Valor inválido" }, { status: 400, headers: cors });
    // _ip/_ua guardam o IP e o navegador REAIS do visitante: a venda chega
    // depois pelo webhook (servidor do gateway) e usa estes dados na CAPI.
    const ipMode=parseTrackingConfig(project.trackingConfig).ipMode;
    const safeBody={...body,email:body.email?"[HASHED]":undefined,phone:body.phone?"[HASHED]":undefined,_ip:clientIp(request,ipMode),_ua:(request.headers.get("user-agent")||"").slice(0,400)||undefined};
    await getDb().insert(events).values({
      id: crypto.randomUUID(), projectId: project.id, eventId, eventName, source: "browser",
      occurredAt: eventTime, visitorId: String(body.visitorId || ""),
      fbclid: String(body.fbclid || attribution.fbclid || ""), fbp: String(body.fbp || ""), fbc: String(body.fbc || ""),
      utmSource:utm("utm_source"),utmCampaign:utm("utm_campaign"),utmMedium:utm("utm_medium"),utmContent:utm("utm_content"),utmTerm:utm("utm_term"),
      value,currency:String(body.currency||"BRL"),payload:JSON.stringify(safeBody)
    }).onConflictDoNothing();
    let capi: unknown = null;
    // AdClick/PageError são diagnósticos internos: o navegador já não os manda
    // ao Pixel, e o servidor também não pode mandá-los à CAPI (poluía o pixel
    // com eventos personalizados sem par para deduplicação).
    if (!internalOnly.has(eventName) && project.pixelId && project.metaTokenCipher && project.metaTokenIv) try {
      const token = await decryptSecret(project.metaTokenCipher, project.metaTokenIv),config=parseTrackingConfig(project.trackingConfig);
      const payload: Record<string, unknown> = { data: [{ event_name: eventName, event_time: eventTime, event_id: eventId, action_source: "website", event_source_url: url, user_data: { client_ip_address: clientIp(request,config.ipMode), client_user_agent: request.headers.get("user-agent") || "", fbp: body.fbp || undefined, fbc: body.fbc || undefined, em:await hash(body.email),ph:await hash(body.phone,true) }, custom_data: { value, currency: String(body.currency || "BRL"), content_ids: body.contentIds || undefined, content_name: body.contentName || undefined, content_type: "product",order_id:body.externalId||undefined } }] };
      if (project.metaTestCode) payload.test_event_code = project.metaTestCode;
      const result = await fetch(`https://graph.facebook.com/v25.0/${project.pixelId}/events?access_token=${encodeURIComponent(token)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(8000) });
      capi = { ok: result.ok, status: result.status };
    } catch {
      // O evento já foi gravado; falha/lentidão da Meta não vira erro p/ o site.
      capi = { ok: false, status: 0 };
    }
    // Monitoramento "de carona" depois de responder; nunca afeta o evento.
    try { after(async () => { const { maybeRunDueMonitors } = await import("@/lib/site-monitor"); await maybeRunDueMonitors(); }); } catch { /* fora do contexto do Next (testes) */ }
    return Response.json({ received: true, eventId, capi }, { headers: cors });
  } catch {
    return Response.json({ error: "Não foi possível registrar o evento" }, { status: 400, headers: cors });
  }
}

export async function GET(request: Request) {
  const userId = await requestUserId(request);
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });
  await ensureDb();
  const url = new URL(request.url);
  const name = (url.searchParams.get("name") || "").trim();
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 200));
  const workspaceId = "ws_" + (await sha256(userId)).slice(0, 24);
  const db = getDb();
  const ps = await db.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.workspaceId, workspaceId));
  if (!ps.length) return Response.json({ events: [] });
  const conds = [inArray(events.projectId, ps.map((p) => p.id))];
  if (name) conds.push(eq(events.eventName, name));
  const rows = await db.select().from(events).where(and(...conds)).orderBy(desc(events.occurredAt)).limit(limit);
  const names = new Map(ps.map((p) => [p.id, p.name]));
  return Response.json({ events: rows.map((row) => ({ ...row, payload: undefined, projectName: names.get(row.projectId) || "" })) });
}
