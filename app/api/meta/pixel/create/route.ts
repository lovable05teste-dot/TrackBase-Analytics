import { and, eq, inArray } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { metaAccounts, metaLinked, projects } from "@/db/schema";
import { metaConfig } from "@/lib/meta";
import { decryptSecret, hasActivePlan, planRequiredResponse, requestUserId, sha256 } from "@/lib/trackbase-security";

type GraphError = { error?: { code?: number; message?: string; error_subcode?: number } };
type Business = { id: string; name?: string };

class PixelCreateError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
  }
}

async function graph<T>(url: URL, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(15000) });
  const body = await response.json().catch(() => ({})) as T & GraphError;
  if (!response.ok || body.error) {
    const code = body.error?.code;
    const raw = body.error?.message || "A Meta recusou a solicitação.";
    if (code === 100 || /missing permission/i.test(raw)) {
      throw new PixelCreateError(
        "META_PERMISSION_REQUIRED",
        "A conta conectada não tem permissão de administrador para criar Pixels. Reconecte a Meta com acesso ao portfólio ou conecte abaixo um Pixel já existente.",
        403,
      );
    }
    if (code === 190) throw new PixelCreateError("META_TOKEN_EXPIRED", "A conexão com a Meta expirou. Reconecte sua conta e tente novamente.", 401);
    throw new PixelCreateError("META_CREATE_REJECTED", raw, 400);
  }
  return body;
}

async function discoverBusiness(token: string, adAccountId: string, version: string): Promise<Business | null> {
  const normalized = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const accountUrl = new URL(`https://graph.facebook.com/${version}/${normalized}`);
  accountUrl.searchParams.set("fields", "business{id,name},owner_business{id,name}");
  accountUrl.searchParams.set("access_token", token);
  try {
    const result = await graph<{ business?: Business; owner_business?: Business }>(accountUrl);
    if (result.business?.id) return result.business;
    if (result.owner_business?.id) return result.owner_business;
  } catch {
    // Algumas contas não expõem owner_business; tenta a lista do usuário.
  }

  const businessesUrl = new URL(`https://graph.facebook.com/${version}/me/businesses`);
  businessesUrl.searchParams.set("fields", "id,name");
  businessesUrl.searchParams.set("limit", "100");
  businessesUrl.searchParams.set("access_token", token);
  try {
    const result = await graph<{ data?: Business[] }>(businessesUrl);
    return result.data?.find((item) => /^\d+$/.test(item.id)) || null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requestUserId(request);
    if (!userId) return Response.json({ error: "Sua sessão expirou. Entre novamente.", code: "AUTH_REQUIRED" }, { status: 401 });
    if (!(await hasActivePlan(userId))) return planRequiredResponse();

    const body = await request.json().catch(() => ({})) as { projectId?: string; name?: string; accountId?: string };
    if (!body.projectId || !body.name?.trim()) return Response.json({ error: "Escolha o projeto e informe o nome do Pixel." }, { status: 400 });

    await ensureDb();
    const db = getDb();
    const workspaceId = `ws_${(await sha256(userId)).slice(0, 24)}`;
    const [project] = await db.select({ id: projects.id }).from(projects)
      .where(and(eq(projects.id, body.projectId), eq(projects.workspaceId, workspaceId))).limit(1);
    if (!project) return Response.json({ error: "Projeto não encontrado." }, { status: 404 });

    const linkRows = await db.select({ adAccountId: metaLinked.adAccountId }).from(metaLinked).where(eq(metaLinked.userId, userId));
    const linkedIds = linkRows.map((row) => row.adAccountId);
    if (!linkedIds.length) return Response.json({ error: "Conecte e selecione uma conta Meta antes de criar o Pixel.", code: "META_ACCOUNT_REQUIRED" }, { status: 400 });

    const accounts = await db.select().from(metaAccounts)
      .where(and(eq(metaAccounts.userId, userId), inArray(metaAccounts.adAccountId, linkedIds)));
    const account = accounts.find((item) => item.id === body.accountId) || accounts[0];
    if (!account) return Response.json({ error: "A conta Meta selecionada não está mais disponível.", code: "META_ACCOUNT_MISSING" }, { status: 404 });

    const token = await decryptSecret(account.accessTokenCipher, account.accessTokenIv);
    const config = metaConfig();
    const business = await discoverBusiness(token, account.adAccountId, config.version);
    if (!business) {
      throw new PixelCreateError(
        "META_BUSINESS_NOT_FOUND",
        "Não encontramos um portfólio empresarial com acesso de administrador nessa conta. Você pode reconectar a Meta ou conectar abaixo um Pixel existente — sem informar ID do negócio.",
        403,
      );
    }

    const createUrl = new URL(`https://graph.facebook.com/${config.version}/${business.id}/adspixels`);
    const form = new URLSearchParams({ name: body.name.trim().slice(0, 120), access_token: token });
    const result = await graph<{ id: string }>(createUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    if (!/^\d+$/.test(result.id || "")) throw new PixelCreateError("META_INVALID_RESPONSE", "A Meta não devolveu um Pixel válido.");

    await db.update(projects).set({
      pixelId: result.id,
      metaTokenCipher: account.accessTokenCipher,
      metaTokenIv: account.accessTokenIv,
      metaConnectedAt: new Date().toISOString(),
    }).where(and(eq(projects.id, body.projectId), eq(projects.workspaceId, workspaceId)));

    return Response.json({
      pixelId: result.id,
      connected: true,
      businessName: business.name || null,
      message: "Pixel criado e conectado. Navegador e Conversions API estão prontos.",
    }, { status: 201 });
  } catch (error) {
    console.error("Meta pixel create", error instanceof PixelCreateError ? error.code : "UNEXPECTED");
    if (error instanceof PixelCreateError) return Response.json({ error: error.message, code: error.code }, { status: error.status });
    return Response.json({ error: "Não foi possível criar o Pixel agora. Tente reconectar a conta Meta ou use um Pixel existente.", code: "META_CREATE_FAILED" }, { status: 500 });
  }
}
