import { z } from "zod";
const validDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+"T00:00:00Z"))&&new Date(value+"T00:00:00Z").toISOString().slice(0,10)===value;
export const dashboardConfigSchema=z.object({
  period:z.enum(["maximum","today","yesterday","last_7d","last_30d","this_month","last_month","custom"]),
  source:z.string().max(150),product:z.string().max(200),
  start:z.string().max(10),end:z.string().max(10),
  metrics:z.array(z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*$/).max(50)).min(1).max(60),
  autoRefresh:z.union([z.literal(0),z.literal(30),z.literal(60),z.literal(300)]),
}).refine(c=>c.period!=="custom"||validDate(c.start)&&validDate(c.end)&&c.start<=c.end,{message:"Confira as datas do período personalizado."});
export type DashboardConfig=z.infer<typeof dashboardConfigSchema>;
export type SavedDashboard={id:string;name:string;config:DashboardConfig};
