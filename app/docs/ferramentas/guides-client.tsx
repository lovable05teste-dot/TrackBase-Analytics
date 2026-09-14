"use client";
import { useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { FEATURE_GUIDES, guideId } from "@/lib/feature-guides";
import { GuideContent } from "@/components/FeatureGuide";
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function GuidesClient() {
  const [query, setQuery] = useState("");
  const guides = FEATURE_GUIDES.filter(g => normalize([g.title, g.category, g.summary, ...g.steps].join(" ")).includes(normalize(query)));
  return <div className="space-y-6">
    <section className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6"><p className="text-xs font-semibold uppercase tracking-widest text-red-400">Guia da operação</p><h2 className="mt-2 text-2xl font-semibold">Uma função por vez.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Comece pelo projeto, instale o tracker e configure o gateway. Depois, conecte as contas de anúncio e teste as proteções. Cada guia mostra o que preparar, como usar e o que conferir.</p><label className="mt-5 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3"><Search className="size-4 text-slate-400" /><span className="sr-only">Buscar função</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar função, evento ou integração…" className="w-full bg-transparent py-3 text-sm outline-none" /></label></section>
    <nav aria-label="Funções disponíveis" className="flex flex-wrap gap-2">{guides.map(g => <a key={g.href} href={"#" + guideId(g.href)} className="rounded-lg border border-white/10 px-3 py-2 text-xs hover:border-red-500/40">{g.title}</a>)}</nav>
    <p role="status" className="text-xs text-slate-400">{guides.length} guias encontrados</p>
    <div className="grid gap-5 lg:grid-cols-2">{guides.map(g => <article key={g.href} id={guideId(g.href)} className="scroll-mt-40 rounded-2xl border border-white/10 bg-[#10131a] p-5 [--muted-foreground:#a4aaba] [--border:#2b3039]"><p className="text-xs text-red-400">{g.category}</p><h2 className="mt-1 text-lg font-semibold">{g.title}</h2><div className="mt-3"><GuideContent guide={g} /></div><a href={g.href} className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-red-400">Abrir ferramenta<ArrowUpRight className="size-4" /></a></article>)}</div>
    {!guides.length && <p className="py-6 text-center text-sm text-slate-400">Nenhuma função encontrada. Tente buscar por Pixel, proteção ou vendas.</p>}
  </div>;
}
