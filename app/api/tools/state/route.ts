import { and, eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { toolStates } from "@/db/schema";
import { requireFeature, workspaceIdForUser } from "@/lib/permissions";
import { TOOL_SCHEMAS, isToolKey } from "@/lib/tool-state";
import { hasConflictingOrigin, requestUserId } from "@/lib/trackbase-security";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
async function context(request: Request) {
  const userId = await requestUserId(request);
  if (!userId) return { error: json({ error: "Entre na sua conta para usar a ferramenta." }, 401) };
  const tool = new URL(request.url).searchParams.get("tool") || "";
  if (!isToolKey(tool)) return { error: json({ error: "Ferramenta inválida." }, 400) };
  const workspaceId = await workspaceIdForUser(userId);
  await ensureDb();
  return { userId, tool, workspaceId, id: workspaceId + ":" + tool };
}
export async function GET(request: Request) {
  try {
    const ctx = await context(request); if (ctx.error) return ctx.error;
    const [row] = await getDb().select().from(toolStates).where(and(eq(toolStates.id, ctx.id), eq(toolStates.workspaceId, ctx.workspaceId))).limit(1);
    return json({ data: row ? JSON.parse(row.data) : ctx.tool === "checklist" ? {} : [], revision: row?.revision ?? 0, canEdit: await requireFeature(ctx.userId, ctx.tool) });
  } catch { return json({ error: "Não foi possível carregar. Tente novamente." }, 503); }
}
export async function PUT(request: Request) {
  if (hasConflictingOrigin(request)) return json({ error: "Origem inválida." }, 403);
  try {
    const ctx = await context(request); if (ctx.error) return ctx.error;
    if (!(await requireFeature(ctx.userId, ctx.tool))) return json({ error: "Seu plano precisa incluir esta ferramenta para salvar.", upgrade: "/planos" }, 402);
    const raw = await request.text(); if (raw.length > 100000) return json({ error: "Conteúdo muito grande." }, 413);
    let body: { revision: number; data: unknown };
    try { body = JSON.parse(raw); if (!body || !Number.isSafeInteger(body.revision) || body.revision < 0) throw new Error(); } catch { return json({ error: "Dados inválidos. Recarregue a ferramenta." }, 400); }
    const parsed = TOOL_SCHEMAS[ctx.tool].safeParse(body.data);
    if (!parsed.success) return json({ error: "Confira os campos e os limites da ferramenta.", detail: parsed.error.issues[0]?.message }, 400);
    const db = getDb(), now = Math.floor(Date.now() / 1000);
    await db.insert(toolStates).values({ id: ctx.id, workspaceId: ctx.workspaceId, tool: ctx.tool, data: ctx.tool === "checklist" ? "{}" : "[]", revision: 0, updatedAt: now }).onConflictDoNothing();
    const [saved] = await db.update(toolStates).set({ data: JSON.stringify(parsed.data), revision: body.revision + 1, updatedAt: now }).where(and(eq(toolStates.id, ctx.id), eq(toolStates.workspaceId, ctx.workspaceId), eq(toolStates.revision, body.revision))).returning({ revision: toolStates.revision });
    if (!saved) return json({ error: "Outra aba salvou alterações. Recarregue antes de continuar." }, 409);
    return json({ saved: true, data: parsed.data, revision: saved.revision });
  } catch { return json({ error: "Não foi possível salvar. Suas alterações ainda não foram confirmadas." }, 503); }
}
