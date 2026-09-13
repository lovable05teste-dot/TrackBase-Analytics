import { getChatGPTUser } from "./chatgpt-auth";
import { LandingPage } from "@/components/LandingPage";
import {DashboardClient} from "./dashboard-client";

export const dynamic = "force-dynamic";

async function fetchAccountData() {
  try {
    const res = await fetch(new URL("/api/account/data", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"), {
      headers: { cookie: (await import("next/headers")).cookies().toString() },
      cache: "no-store",
    });
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

export default async function Home(){
  const user = await getChatGPTUser();
  if (!user) return <LandingPage/>;
  const accountData = await fetchAccountData();
  const defaultAccount = accountData ?? { userName: "Usuário", userEmail: "", workspaceName: "Workspace", planName: "—", planStatus: "demo", avatarInitial: "U" };
  return <DashboardClient accountData={defaultAccount} />
}
