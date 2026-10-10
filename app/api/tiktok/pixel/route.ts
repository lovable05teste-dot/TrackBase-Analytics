import { and, eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { projects } from "@/db/schema";
import { requireFeature } from "@/lib/permissions";
import { isTiktokPixelCode } from "@/lib/tiktok";
import { encryptSecret, requestUserId, sha256 } from "@/lib/trackbase-security";

export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

async function context(request: Request) {
  const userId = await requestUserId(request);
  if (!userId) return null;
  await ensureDb();
  return { userId, workspaceId: "ws_" + (await sha256(userId)).slice(0, 24) };
}

async function list(workspaceId: string) {
  const rows = await getDb().select({ id: projects.id, name: projects.name, domain: projects.domain, code: projects.tiktokPixelId, cipher: projects.tiktokTokenCipher, testCode: projects.tiktokTestCode }).from(projects).where(eq(projects.workspaceId, workspaceId));
  return rows.map((r) => ({ id: r.id, name: r.name, domain: r.domain, pixelCode: r.code, hasToken: Boolean(r.cipher), testCode: r.testCode }));
}

export async function GET(request: Request) {
  const ctx = await context(request);
  if (!ctx) return json({ error: "Não autenticado" }, 401);
  return json({ projects: await list(ctx.workspaceId) });
}

// Salva o Pixel TikTok + token da Events API de um projeto. O token fica
// criptografado; o script da página passa a carregar o pixel sozinho.
export async function POST(request: Request) {
  const ctx = await context(request);
  if (!ctx) return json({ error: "Não autenticado" }, 401);
  if (!(await requireFeature(ctx.userId, "ativador_tiktok"))) return json({ error: "Seu plano precisa estar ativo para conectar o Pixel TikTok.", upgrade: "/planos" }, 402);
  const body = (await request.json().catch(() => ({}))) as { projectId?: unknown; pixelCode?: unknown; accessToken?: unknown; testCode?: unknown };
  const pixelCode = String(body.pixelCode || "").trim().toUpperCase();
  const accessToken = String(body.accessToken || "").trim();
  if (!isTiktokPixelCode(pixelCode)) return json({ error: "Código do Pixel TikTok inválido (ex.: CQ1ABC2DEF3GH4IJ5KL6)." }, 400);
  const [owned] = await getDb().select({ id: projects.id, cipher: projects.tiktokTokenCipher }).from(projects).where(and(eq(projects.id, String(body.projectId || "")), eq(projects.workspaceId, ctx.workspaceId))).limit(1);
  if (!owned) return json({ error: "Projeto não encontrado." }, 404);
  if (!accessToken && !owned.cipher) return json({ error: "Cole o token de acesso da Events API." }, 400);
  if (accessToken && (accessToken.length < 20 || accessToken.length > 400)) return json({ error: "Token de acesso inválido." }, 400);
  const secured = accessToken ? await encryptSecret(accessToken) : null;
  const testCode = String(body.testCode || "").trim().slice(0, 40) || null;
  await getDb().update(projects).set({ tiktokPixelId: pixelCode, tiktokTestCode: testCode, ...(secured ? { tiktokTokenCipher: secured.cipher, tiktokTokenIv: secured.iv } : {}) }).where(eq(projects.id, owned.id));
  return json({ projects: await list(ctx.workspaceId) });
}

export async function DELETE(request: Request) {
  const ctx = await context(request);
  if (!ctx) return json({ error: "Não autenticado" }, 401);
  const projectId = new URL(request.url).searchParams.get("projectId") || "";
  await getDb().update(projects).set({ tiktokPixelId: null, tiktokTokenCipher: null, tiktokTokenIv: null, tiktokTestCode: null }).where(and(eq(projects.id, projectId), eq(projects.workspaceId, ctx.workspaceId)));
  return json({ projects: await list(ctx.workspaceId) });
}
