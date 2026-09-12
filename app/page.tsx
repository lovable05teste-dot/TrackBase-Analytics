import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getChatGPTUser } from "./chatgpt-auth";
import { getUserIdFromSessionCookie, hasActivePlan } from "@/lib/trackbase-security";
import { LandingPage } from "@/components/LandingPage";
import { VitrineDashboard } from "@/components/VitrineDashboard";
import {DashboardClient} from "./dashboard-client";
export const dynamic = "force-dynamic";
export default async function Home(){const user=await getChatGPTUser();if(!user)return <LandingPage/>;const jar=await cookies();const userId=await getUserIdFromSessionCookie(jar.get("tb_session")?.value);if(userId&&!(await hasActivePlan(userId))){if(jar.get("gs_vitrine")?.value==="1")return <VitrineDashboard userName={user.displayName}/>;redirect("/planos");}return <DashboardClient/>}
