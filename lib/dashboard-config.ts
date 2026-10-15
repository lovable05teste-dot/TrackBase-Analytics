import { z } from "zod";
export const dashboardCostsSchema=z.object({productCostPct:z.number().min(0).max(100),gatewayFeePct:z.number().min(0).max(100),gatewayFeeFixed:z.number().min(0).max(1000),taxPct:z.number().min(0).max(100),otherMonthly:z.number().min(0).max(100000000)});
const ids=z.array(z.string().min(1).max(100)).max(100);
export const dashboardScopeSchema=z.object({projectIds:ids.min(1),metaAccountIds:ids,tiktokAccountIds:ids,metaCampaignIds:z.array(z.string().regex(/^\d{6,25}$/)).max(200).default([]),tiktokCampaignIds:z.array(z.string().regex(/^\d{6,25}$/)).max(200).default([])}).refine(s=>(!s.metaCampaignIds.length||!!s.metaAccountIds.length)&&(!s.tiktokCampaignIds.length||!!s.tiktokAccountIds.length),{message:"Escolha as contas antes de informar campanhas."});
export type DashboardScope=z.infer<typeof dashboardScopeSchema>;
const validDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+"T00:00:00Z"))&&new Date(value+"T00:00:00Z").toISOString().slice(0,10)===value;
export const dashboardConfigSchema=z.object({
  period:z.enum(["maximum","today","yesterday","last_7d","last_30d","this_month","last_month","custom"]),
  source:z.string().max(150),product:z.string().max(200),
  start:z.string().max(10),end:z.string().max(10),
  metrics:z.array(z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*$/).max(50)).min(1).max(60),
  autoRefresh:z.union([z.literal(0),z.literal(30),z.literal(60),z.literal(300)]),
  scope:dashboardScopeSchema.optional(),
  costs:dashboardCostsSchema.optional(),
}).refine(c=>c.period!=="custom"||validDate(c.start)&&validDate(c.end)&&c.start<=c.end,{message:"Confira as datas do período personalizado."});
export type DashboardConfig=z.infer<typeof dashboardConfigSchema>;
export type SavedDashboard={id:string;name:string;config:DashboardConfig};
