import type { MetadataRoute } from "next";

function adminPath() {
  const raw = (process.env.ADMIN_PANEL_PATH || "").trim();
  if (!raw) return "/837388318admin";
  return raw.startsWith("/") ? raw : `/${raw}`;
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: [adminPath(), "/api/auth/"] }],
  };
}
