import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getChatGPTUser } from "./chatgpt-auth";
import { getUserIdFromSessionCookie, hasActivePlan } from "@/lib/trackbase-security";
import { LandingPage } from "@/components/LandingPage";
import {DashboardClient} from "./dashboard-client";
export const dynamic = "force-dynamic";
export default async function Home(){const user=await getChatGPTUser();if(!user)return <LandingPage/>;const session=(await cookies()).get("tb_session")?.value;const userId=await getUserIdFromSessionCookie(session);if(userId&&!(await hasActivePlan(userId)))redirect("/planos");return <DashboardClient/>}
