import { AppShell } from "@/components/AppShell";
import { PixelConnect } from "../integracoes/connections";
export const dynamic="force-dynamic";
export default function Page(){return <AppShell title="Pixels e conversões" subtitle="Conecte vários pixels por projeto e envie eventos pelo navegador e pela API de Conversões."><section className="mx-auto max-w-5xl rounded-2xl border border-border bg-card p-5"><PixelConnect/></section></AppShell>}
