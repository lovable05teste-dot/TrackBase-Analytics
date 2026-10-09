import { eq } from "drizzle-orm";
import type { getDb } from "@/db";
import { capiOutbox, projects } from "@/db/schema";
import { purchaseUserData } from "@/lib/capi-user-data";
import { parseTrackingConfig } from "@/lib/tracking-config";
import { drainCapiOutbox, enqueueCapiOutbox, pick, visitorContext } from "@/lib/sale-ingest";

function websiteUrl(...values: unknown[]) {
  for (const value of values) {
    if (typeof value !== "string" || !value.trim()) continue;
    try {
      const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
      if (["http:", "https:"].includes(url.protocol) && url.hostname.includes(".") && !url.username && !url.password) return url.toString();
    } catch {}
  }
}

// Persist before decrypting or contacting Meta. A configuration/decryption
// failure is retryable and visible, even though the sale itself was saved.
export async function queuePurchaseCapi(db: ReturnType<typeof getDb>, input: {
  workspaceId: string; projectId: string; eventId: string; externalId: string;
  occurredAt: number; value: number; currency: string; body: Record<string, unknown>;
  visitorId: string; fbclid: string; fbc: string; fbp: string;
}) {
  const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId)).limit(1);
  if (!project) throw new Error("Projeto da compra não encontrado");
  const { body } = input;
  const config = parseTrackingConfig(project.trackingConfig);
  const visitor = await visitorContext(db, input.projectId, input);
  const email = pick(body, ["email", "customer.email", "data.customer.email", "buyer.email", "customer_email", "data.buyer.email"]);
  const phone = pick(body, ["phone", "customer.phone", "data.customer.phone", "buyer.phone", "customer_phone", "customer.phone_number", "data.buyer.phone"]);
  const name = pick(body, ["customer.name", "data.customer.name", "buyer.name", "customer_name", "data.buyer.name", "name"]);
  const ip = visitor.ip || String(pick(body, ["customer.ip", "data.customer.ip", "client_ip", "buyer.ip", "tracking.ip", "ip"]) || "");
  const ua = visitor.ua || String(pick(body, ["user_agent", "customer.user_agent", "data.customer.user_agent", "tracking.user_agent"]) || "");
  const payload = {
    data: [{
      event_name: "Purchase", event_id: input.eventId, event_time: input.occurredAt,
      action_source: "website",
      event_source_url: websiteUrl(pick(body, ["url", "checkout_url", "tracking.url", "metadata.url"]), visitor.url, project.domain),
      user_data: await purchaseUserData({ email, phone, name, visitorId: input.visitorId,
        ip: config.ipMode === "disabled" || (config.ipMode === "ipv4" && !/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) ? undefined : ip,
        ua, fbc: input.fbc || visitor.fbc, fbp: input.fbp || visitor.fbp }),
      custom_data: { value: config.purchase.valueSource === "fixed" ? config.purchase.fixedValue : input.value,
        currency: input.currency, order_id: input.externalId },
    }],
  };
  const id = await enqueueCapiOutbox(db, { workspaceId: input.workspaceId, projectId: input.projectId,
    pixelId: project.pixelId || "", eventName: "Purchase", eventId: input.eventId, payload, immediate: true });
  await drainCapiOutbox(db, { workspaceId: input.workspaceId, id, limit: 1 });
  const [receipt] = await db.select({ status: capiOutbox.status }).from(capiOutbox).where(eq(capiOutbox.id, id)).limit(1);
  return receipt?.status || "queued";
}
