import { getChatGPTUser } from "./chatgpt-auth";
import { LandingPage } from "@/components/LandingPage";
import {DashboardClient} from "./dashboard-client";
import { getCurrentAccountData } from "@/lib/account";
import { loadSetupStatus, SETUP_STEPS } from "@/lib/setup-status";

export const dynamic = "force-dynamic";

export default async function Home(){
  const user = await getChatGPTUser();
  if (!user) return <LandingPage/>;
  const [accountData, status] = await Promise.all([getCurrentAccountData(user), loadSetupStatus()]);
  const next = SETUP_STEPS.find((step) => !step.done(status));
  const setup = { done: SETUP_STEPS.filter((step) => step.done(status)).length, total: SETUP_STEPS.length, next: next ? { id: next.id, title: next.title } : null };
  return <DashboardClient accountData={accountData} setup={setup} />
}
