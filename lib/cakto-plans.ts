// Compat: re-export do central lib/plans.ts (fonte única). Mantido para não quebrar imports legados.
export { type PlanId, PLAN_IDS, PLANS, PLANS_V2, PLANS_V1, PLAN_ORDER, PLAN_VERSION_CURRENT, EXCESS_PER_SALE, isPlanId, planOfferId, plansCatalog, getEffectivePlan } from "./plans";
