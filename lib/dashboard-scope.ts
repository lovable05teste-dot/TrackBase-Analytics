import { and,eq,inArray } from "drizzle-orm";
import type { getDb } from "@/db";
import { projects,metaAccounts,tiktokAccounts,savedDashboards } from "@/db/schema";
import { dashboardConfigSchema,type DashboardScope } from "@/lib/dashboard-config";
import { parseUtm,isMetaTraffic } from "@/lib/utm-match";
type Db=ReturnType<typeof getDb>;
export class DashboardScopeError extends Error { status=409; }
export async function validateDashboardScope(db:Db,scope:DashboardScope,userId:string,workspaceId:string) {
 const [ps,meta,tt]=await Promise.all([
  db.select({id:projects.id}).from(projects).where(and(eq(projects.workspaceId,workspaceId),inArray(projects.id,scope.projectIds))),
  scope.metaAccountIds.length?db.select({id:metaAccounts.id}).from(metaAccounts).where(and(eq(metaAccounts.userId,userId),inArray(metaAccounts.id,scope.metaAccountIds))):Promise.resolve([]),
  scope.tiktokAccountIds.length?db.select({id:tiktokAccounts.id}).from(tiktokAccounts).where(and(eq(tiktokAccounts.userId,userId),inArray(tiktokAccounts.id,scope.tiktokAccountIds))):Promise.resolve([]),
 ]);
 if(ps.length!==new Set(scope.projectIds).size||meta.length!==new Set(scope.metaAccountIds).size||tt.length!==new Set(scope.tiktokAccountIds).size)throw new DashboardScopeError("Um projeto ou conta vinculado não está disponível. Edite os vínculos deste dashboard.");
}
export async function dashboardScope(db:Db,params:URLSearchParams,userId:string,workspaceId:string):Promise<DashboardScope|null> {
 const id=params.get("dashboardId");if(!id)return null;
 const [row]=await db.select().from(savedDashboards).where(and(eq(savedDashboards.id,id),eq(savedDashboards.workspaceId,workspaceId))).limit(1);
 if(!row)throw new DashboardScopeError("Dashboard não encontrado.");
 let config;try{config=dashboardConfigSchema.parse(JSON.parse(row.config))}catch{throw new DashboardScopeError("Configure os vínculos deste dashboard.")}
 if(!config.scope)throw new DashboardScopeError("Este dashboard ainda não tem projetos e contas próprios. Edite seus vínculos.");
 await validateDashboardScope(db,config.scope,userId,workspaceId);return config.scope;
}
export function matchesDashboardCampaign(scope:DashboardScope|null,event:{utmSource?:string|null;utmCampaign?:string|null;fbclid?:string|null}) {
 if(!scope)return true;
 const tt=/^(tiktok|tt|tik_tok)(?=$|[^a-z])/i.test(event.utmSource||"");
 const allowed=tt?scope.tiktokCampaignIds:isMetaTraffic(event)?scope.metaCampaignIds:[];
 return !allowed.length||allowed.includes(parseUtm(event.utmCampaign).id||"");
}
