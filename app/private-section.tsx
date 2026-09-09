import { requireChatGPTUser } from "./chatgpt-auth";
import { AppShell } from "@/components/AppShell";
export async function PrivateSection({title,description,children}:{title:string;description:string;children?:React.ReactNode}){await requireChatGPTUser("/");return <AppShell title={title} subtitle={description}>{children||<div className="metric-card rounded-xl p-8 text-center text-slate-400">Nenhum dado recebido ainda.</div>}</AppShell>}
