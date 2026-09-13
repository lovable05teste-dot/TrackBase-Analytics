import { getChatGPTUser } from "./chatgpt-auth";
import { LandingPage } from "@/components/LandingPage";
import {DashboardClient} from "./dashboard-client";
export const dynamic = "force-dynamic";
// Logado entra no painel (modo visualização quando sem plano — a faixa "Ver
// planos" aparece via PrivateSection; criar/editar é barrado nas APIs).
export default async function Home(){const user=await getChatGPTUser();if(!user)return <LandingPage/>;return <DashboardClient/>}
