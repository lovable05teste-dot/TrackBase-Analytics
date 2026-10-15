import { AppShell } from "@/components/AppShell";
import { PixelConnect } from "../integracoes/connections";
export const dynamic="force-dynamic";
export default function Page(){return <AppShell title="Pixels e conversões" subtitle="Crie um pixel GhostScale, instale um único código e conecte seus pixels Meta com ID e token."><section className="mx-auto max-w-5xl rounded-2xl border border-border bg-card p-5"><PixelConnect allowCreateTrackingPixel/></section></AppShell>}
