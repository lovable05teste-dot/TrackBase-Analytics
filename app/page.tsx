import { requireChatGPTUser } from "./chatgpt-auth";
import {DashboardClient} from "./dashboard-client";
export const dynamic = "force-dynamic";
export default async function Home(){await requireChatGPTUser("/");return <DashboardClient/>}
