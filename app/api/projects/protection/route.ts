import { and, desc, eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { protectionReports, projects, siteProtections } from "@/db/schema";
import { audit, requireFeature, workspaceIdForUser } from "@/lib/permissions";
import { defaultProtection, parseProtection, validateProtection } from "@/lib/protection";
import { normalizeIp, parseBlockedIps } from "@/lib/protection-ip";
import { hasConflictingOrigin, requestUserId } from "@/lib/trackbase-security";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

async function context(request: Request) {
  const userId = await requestUserId(request);
  if (!userId) return { error: json({ error: "Entre na sua conta para continuar." }, 401) };
  const workspaceId = await workspaceIdForUser(userId);
  const projectId = new URL(request.url).searchParams.get("projectId") || "";
  await ensureDb();
  const [project] = await getDb().select({ id: projects.id, name: projects.name, domain: projects.domain, publicKey: projects.publicKey }).from(projects).where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId))).limit(1);
  if (!project) return { error: json({ error: "Projeto não encontrado nesta conta." }, 404) };
  return { userId, workspaceId, project };
}

export async function GET(request: Request) {
  try {
    const ctx = await context(request);
    if (ctx.error) return ctx.error;
    const [row] = await getDb().select().from(siteProtections).where(and(eq(siteProtections.projectId, ctx.project.id), eq(siteProtections.workspaceId, ctx.workspaceId))).limit(1);
    const reports = await getDb().select({ eventName: protectionReports.eventName, occurredAt: protectionReports.occurredAt, payload: protectionReports.payload }).from(protectionReports).where(eq(protectionReports.projectId, ctx.project.id)).orderBy(desc(protectionReports.occurredAt)).limit(20);
    return json({ project: ctx.project, config: parseProtection(row?.config, ctx.project.domain), blockedIps: parseBlockedIps(row?.blockedIps), revision: row?.revision ?? 0, reports: reports.map(r => { let data: Record<string, unknown> = {}; try { data = JSON.parse(r.payload || "{}"); } catch {} return { eventName: r.eventName, occurredAt: r.occurredAt, host: String(data.host || ""), reason: String(data.reason || ""), mode: String(data.mode || "") }; }) });
  } catch { return json({ error: "Não foi possível carregar a proteção. Tente novamente." }, 503); }
}

async function save(request: Request, kind: "config" | "ip") {
  if (hasConflictingOrigin(request)) return json({ error: "Origem inválida." }, 403);
  try {
    const ctx = await context(request);
    if (ctx.error) return ctx.error;
    if (!(await requireFeature(ctx.userId, kind === "ip" ? "blacklist" : "anti_clone"))) return json({ error: kind === "ip" ? "A blacklist está disponível a partir do Pro com pagamento confirmado." : "Ative um plano pago para salvar a proteção.", upgrade: "/planos" }, 402);
    const text = await request.text();
    if (text.length > 16000) return json({ error: "Configuração muito grande." }, 413);
    let body: Record<string, unknown>;
    try { body = JSON.parse(text); if (!body || typeof body !== "object") throw new Error(); } catch { return json({ error: "JSON inválido." }, 400); }
    if (!Number.isSafeInteger(body.revision) || Number(body.revision) < 0) return json({ error: "Recarregue a configuração antes de salvar." }, 400);
    const db = getDb(), now = Math.floor(Date.now() / 1000);
    let config: ReturnType<typeof validateProtection> | undefined, ip = "";
    try {
      if (kind === "config") config = validateProtection(body.config);
      else { if (body.action !== "add" && body.action !== "remove") throw new Error("Ação inválida."); ip = normalizeIp(String(body.ip || "")); }
    } catch (e) { return json({ error: e instanceof Error ? e.message : "Configuração inválida." }, 400); }
    await db.insert(siteProtections).values({ projectId: ctx.project.id, workspaceId: ctx.workspaceId, config: JSON.stringify(defaultProtection(ctx.project.domain)), blockedIps: "[]", revision: 0, updatedAt: now }).onConflictDoNothing();
    const cond = and(eq(siteProtections.projectId, ctx.project.id), eq(siteProtections.workspaceId, ctx.workspaceId));
    const [current] = await db.select().from(siteProtections).where(cond).limit(1);
    if (!current || current.revision !== body.revision) return json({ error: "Outra aba alterou estas regras. Recarregue antes de salvar." }, 409);
    let blockedIps = parseBlockedIps(current.blockedIps);
    if (kind === "ip") {
      blockedIps = body.action === "add" ? [...new Set([...blockedIps, ip])] : blockedIps.filter(v => v !== ip);
      if (blockedIps.length > 200) return json({ error: "Limite de 200 IPs por projeto. Use o firewall da hospedagem para listas maiores." }, 400);
    }
    const [saved] = await db.update(siteProtections).set({ ...(config ? { config: JSON.stringify(config) } : { blockedIps: JSON.stringify(blockedIps) }), revision: current.revision + 1, updatedAt: now }).where(and(cond, eq(siteProtections.revision, current.revision))).returning({ revision: siteProtections.revision });
    if (!saved) return json({ error: "As regras mudaram em outra aba. Recarregue antes de salvar." }, 409);
    await audit(ctx.workspaceId, ctx.userId, kind === "ip" ? "protection.blacklist.update" : "protection.update", "project", ctx.project.id);
    return json({ saved: true, revision: saved.revision, config: config || parseProtection(current.config, ctx.project.domain), blockedIps });
  } catch { return json({ error: "Não foi possível salvar. Suas alterações ainda não foram confirmadas." }, 503); }
}
export const PUT = (request: Request) => save(request, "config");
export const PATCH = (request: Request) => save(request, "ip");
