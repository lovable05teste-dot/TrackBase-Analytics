"use client";
import { usePathname } from "next/navigation";
import { BookOpen, ChevronDown } from "lucide-react";
import { FEATURE_GUIDES, guideId, type FeatureGuide as Guide } from "@/lib/feature-guides";

export function GuideContent({ guide }: { guide: Guide }) {
  return <div className="space-y-4 text-sm leading-6">
    <p className="text-muted-foreground">{guide.summary}</p>
    <div><h3 className="font-semibold">Antes de começar</h3><p className="text-muted-foreground">{guide.needs}</p></div>
    <ol className="list-decimal space-y-2 pl-5">{guide.steps.map(step => <li key={step} className="pl-1">{step}</li>)}</ol>
    <div className="rounded-xl border border-red-500/15 bg-red-500/5 p-3"><h3 className="font-semibold">Se algo não funcionar</h3><p className="mt-1 text-muted-foreground">{guide.troubleshoot}</p></div>
    <p className="text-muted-foreground">{guide.example}</p>
  </div>;
}

export function FeatureGuide() {
  const pathname = usePathname();
  const guide = FEATURE_GUIDES.find(item => item.href === pathname);
  if (!guide) return null;
  return <details className="group mb-5 rounded-2xl border border-red-500/15 bg-card text-foreground">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"><span className="flex items-center gap-2 text-sm font-medium"><BookOpen className="size-4 text-red-500" />Como usar {guide.title}</span><ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" /></summary>
    <div className="border-t border-border p-4 sm:p-5"><GuideContent guide={guide} /><a className="mt-4 inline-block text-sm font-medium text-red-500 underline" href={"/docs/ferramentas#" + guideId(guide.href)}>Abrir central de guias →</a></div>
  </details>;
}
