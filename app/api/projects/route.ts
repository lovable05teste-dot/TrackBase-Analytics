import { and,eq } from "drizzle-orm";
import { ensureDb, getDb } from "../../../db";
import { apiCredentials,events,members,orders,projects,workspaces } from "../../../db/schema";
import { hasActivePlan, hasConflictingOrigin, planRequiredResponse, requestUserId, sha256 } from "../../../lib/trackbase-security";

export async function GET(request: Request) {
  await ensureDb();
  const userId = await requestUserId(request);
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const workspaceId = "ws_" + (await sha256(userId)).slice(0, 24);
  const rows = await getDb().select({
    id: projects.id, name: projects.name, domain: projects.domain,
    publicKey: projects.publicKey, pixelId: projects.pixelId,
    metaConnectedAt: projects.metaConnectedAt
  }).from(projects).where(eq(projects.workspaceId, workspaceId));
  return Response.json({ projects: rows });
}

export async function POST(request: Request) {
  if (hasConflictingOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  await ensureDb();
  const userId = await requestUserId(request);
  if (!userId) return Response.json({ error: "Não autenticado" }, { status: 401 });
  if (!(await hasActivePlan(userId))) return planRequiredResponse();
  const body = await request.json() as { id?: string; name?: string; domain?: string; pixelId?: string };
  const workspaceId = "ws_" + (await sha256(userId)).slice(0, 24);
  const db = getDb();
  if (body.id) {
    const [owned] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, body.id), eq(projects.workspaceId, workspaceId))).limit(1);
    if (!owned) return Response.json({ error: "Projeto não encontrado" }, { status: 404 });
    const name = body.name?.trim();
    if (name !== undefined && !name) return Response.json({ error: "Informe o nome do projeto" }, { status: 400 });
    await db.update(projects).set({
      ...(name !== undefined ? { name } : {}),
      ...(body.domain !== undefined ? { domain: body.domain.trim() || null } : {}),
      ...(body.pixelId !== undefined ? { pixelId: body.pixelId.trim() || null } : {}),
    }).where(eq(projects.id, body.id));
    const [updated] = await db.select({ id: projects.id, name: projects.name, domain: projects.domain, publicKey: projects.publicKey, pixelId: projects.pixelId }).from(projects).where(eq(projects.id, body.id)).limit(1);
    return Response.json({ project: updated });
  }
  if (!body.name?.trim()) return Response.json({ error: "Informe o nome do projeto" }, { status: 400 });
  // limite de projetos por plano (compartilhado no workspace)
  const { getPlanContext } = await import("../../../lib/permissions");
  const { getEffectivePlan } = await import("../../../lib/plans");
  const ctx = await getPlanContext(userId);
  const eff = ctx.plan ? getEffectivePlan(ctx.plan as never, ctx.version) : null;
  const limit = eff?.limits.projects ?? 0;
  const existingCount = await db.select({ id: projects.id }).from(projects).where(eq(projects.workspaceId, workspaceId));
  if (existingCount.length >= limit) return Response.json({ error: `Limite de ${limit} projetos do plano ${eff?.name ?? ""} atingido. Faça upgrade em /planos.`, upgrade: "/planos" }, { status: 402 });
  const projectName=body.name.trim();
  const projectId = crypto.randomUUID();
  const publicKey = crypto.randomUUID().replaceAll("-", "");
  const webhookSecret = "tbwh_" + crypto.randomUUID().replaceAll("-", "");
  const now = new Date().toISOString();
  await db.transaction(async tx=>{
    await tx.insert(workspaces).values({ id: workspaceId, name: "Meu workspace", createdAt: now }).onConflictDoNothing();
    await tx.insert(members).values({ id: crypto.randomUUID(), workspaceId, userId, role: "owner" }).onConflictDoNothing();
    await tx.insert(projects).values({ id: projectId, workspaceId, name: projectName, domain: body.domain?.trim() || null, publicKey, webhookSecretHash: await sha256(webhookSecret), createdAt: now });
  });
  const origin = new URL(request.url).origin;
  return Response.json({ project: { id: projectId, name: projectName, publicKey }, webhookSecret, script: `<script async src="${origin}/tracker.js?key=${publicKey}"></script>` }, { status: 201 });
}

export async function DELETE(request:Request){
  if (hasConflictingOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  await ensureDb();const userId=await requestUserId(request);if(!userId)return Response.json({error:"Não autenticado"},{status:401});if(!(await hasActivePlan(userId)))return planRequiredResponse();
  const id=new URL(request.url).searchParams.get("id");if(!id)return Response.json({error:"Projeto não informado"},{status:400});
  const workspaceId="ws_"+(await sha256(userId)).slice(0,24),db=getDb(),[owned]=await db.select({id:projects.id}).from(projects).where(and(eq(projects.id,id),eq(projects.workspaceId,workspaceId))).limit(1);
  if(!owned)return Response.json({error:"Projeto não encontrado"},{status:404});
  await db.transaction(async tx=>{await tx.delete(events).where(eq(events.projectId,id));await tx.delete(orders).where(eq(orders.projectId,id));await tx.delete(apiCredentials).where(eq(apiCredentials.projectId,id));await tx.delete(projects).where(eq(projects.id,id))});
  return Response.json({deleted:true,id});
}
