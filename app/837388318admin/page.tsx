import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { adminPanelPath, getUserIdFromSessionCookie, isAdminUserId, logAdminAccess } from "@/lib/trackbase-security";
import { AdminLoginForm } from "./admin-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Acesso administrativo",
  robots: { index: false, follow: false, noarchive: true },
};

// Página de login do painel isolado. Camadas:
// 1) caminho não-óbvio, rotacionável via ADMIN_PANEL_PATH (mismatch = 404 mudo);
// 2) nunca linkada publicamente + noindex + robots.txt;
// 3) o POST /api/auth/login exige a senha + 2FA do dono (se configurado);
// 4) toda renderização (GET) e tentativa são logadas no servidor.
export default async function SecretAdmin() {
  if (adminPanelPath() !== "/837388318admin") {
    logAdminAccess("path-mismatch", {});
    notFound();
  }
  const session = (await cookies()).get("tb_session")?.value;
  const userId = await getUserIdFromSessionCookie(session);
  if (userId && (await isAdminUserId(userId))) redirect("/");
  logAdminAccess("page-view", {});
  return <AdminLoginForm />;
}
