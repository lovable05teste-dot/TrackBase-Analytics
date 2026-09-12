import { eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { users } from "@/db/schema";
import { hasConflictingOrigin, isAdminUserId, logAdminAccess, requestUserId } from "@/lib/trackbase-security";

// Administração de papéis. Guard: sessão válida + role admin (dono via
// ADMIN_PASSWORD ou usuário com role='admin'). Sem isso → 404 mudo.
async function requireAdmin(request: Request) {
  const me = await requestUserId(request);
  if (!me || !(await isAdminUserId(me))) return null;
  return me;
}

// GET: lista usuários (sem hashes/segredos) para gestão.
export async function GET(request: Request) {
  const me = await requireAdmin(request);
  if (!me) return Response.json({ error: "Não encontrado." }, { status: 404 });
  try {
    await ensureDb();
    const rows = await getDb()
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        totpEnabled: users.totpEnabled,
        emailVerifiedAt: users.emailVerifiedAt,
        createdAt: users.createdAt,
      })
      .from(users);
    return Response.json({ users: rows });
  } catch (error) {
    console.error("admin users list", error);
    return Response.json({ error: "Erro interno." }, { status: 500 });
  }
}

// POST {email, role}: promove/rebaixa usuário (role = member|admin).
export async function POST(request: Request) {
  if (hasConflictingOrigin(request)) return Response.json({ error: "Origem inválida." }, { status: 403 });
  const me = await requireAdmin(request);
  if (!me) return Response.json({ error: "Não encontrado." }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { email?: string; role?: string };
  const email = String(body.email || "").trim().toLowerCase();
  const role = String(body.role || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "Informe um e-mail válido." }, { status: 400 });
  if (role !== "member" && role !== "admin") return Response.json({ error: "Papel inválido (member|admin)." }, { status: 400 });
  try {
    await ensureDb();
    const updated = await getDb().update(users).set({ role }).where(eq(users.email, email)).returning({ id: users.id });
    if (!updated.length) return Response.json({ error: "Usuário não encontrado." }, { status: 404 });
    logAdminAccess("role-changed", { by: me, email, role });
    return Response.json({ ok: true, email, role });
  } catch (error) {
    console.error("admin users update", error);
    return Response.json({ error: "Erro interno." }, { status: 500 });
  }
}
