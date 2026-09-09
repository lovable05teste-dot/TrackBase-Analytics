import { getChatGPTUser } from "./chatgpt-auth";
import { LandingPage } from "@/components/LandingPage";
import {DashboardClient} from "./dashboard-client";
export const dynamic = "force-dynamic";
export default async function Home(){const user=await getChatGPTUser();if(!user)return <LandingPage/>;return <DashboardClient/>}
