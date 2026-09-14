import { z } from "zod";

const webUrl = z.string().max(2048).url().refine(value => { const u = new URL(value); return ["https:", "http:"].includes(u.protocol) && !u.username && !u.password; }, "Use uma URL HTTP ou HTTPS sem senha.");
const id = z.string().min(1).max(100);
export const TOOL_SCHEMAS = {
  mapa_links: z.array(z.object({ id, label: z.string().min(1).max(120), url: webUrl })).max(200),
  checklist: z.record(z.boolean()).refine(v => Object.keys(v).length <= 100 && Object.keys(v).every(k => k.length < 300)),
  monitoramento: z.array(z.object({ id, url: webUrl, status: z.string().max(80), ms: z.number().nonnegative().finite().nullable(), checkedAt: z.string().max(100).nullable() })).max(30),
  offer_lab: z.array(z.object({ id, name: z.string().min(1).max(80), price: z.number().positive().finite().max(100000000), hook: z.string().max(140), status: z.enum(["em teste", "vencedora"]) })).max(200),
  agent_hub: z.array(z.object({ id, name: z.string().min(1).max(120), condition: z.string().max(300), action: z.string().max(300), active: z.boolean() })).max(100),
};
export type ToolKey = keyof typeof TOOL_SCHEMAS;
export function isToolKey(value: string): value is ToolKey { return Object.hasOwn(TOOL_SCHEMAS, value); }
export function parsePrice(value: string): number {
  const normalized = value.trim().replace(/\s|R\$/g, "");
  if (!/^[\d.,]+$/.test(normalized)) return NaN;
  const decimal = normalized.includes(",") ? normalized.replace(/\./g, "").replace(",", ".") : normalized;
  return /^\d+(\.\d{1,2})?$/.test(decimal) ? Number(decimal) : NaN;
}
