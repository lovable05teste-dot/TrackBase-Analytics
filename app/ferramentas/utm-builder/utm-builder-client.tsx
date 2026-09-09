"use client";
import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function UtmBuilderClient() {
  const [base, setBase] = useState("https://sua-pagina.com/oferta");
  const [source, setSource] = useState("facebook");
  const [medium, setMedium] = useState("paid");
  const [campaign, setCampaign] = useState("{{campaign.name}}|{{campaign.id}}");
  const [content, setContent] = useState("{{ad.name}}|{{ad.id}}");
  const [term, setTerm] = useState("{{adset.name}}|{{adset.id}}");
  const [copied, setCopied] = useState(false);
  const url = useMemo(() => {
    const p = new URLSearchParams({ utm_source: source, utm_medium: medium, utm_campaign: campaign, utm_content: content, utm_term: term });
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}${p.toString()}`;
  }, [base, source, medium, campaign, content, term]);
  async function copy() { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }
  const input = "w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm";
  return (
    <Card className="metric-card">
      <CardHeader><CardTitle>UTM Builder</CardTitle></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        <label className="text-sm md:col-span-2">URL base<input value={base} onChange={(e) => setBase(e.target.value)} className={input} /></label>
        {[["utm_source", source, setSource, ["facebook", "instagram", "tiktok", "google"]], ["utm_medium", medium, setMedium, ["paid", "cpc", "organic", "social"]], ["utm_campaign", campaign, setCampaign, []], ["utm_content", content, setContent, []], ["utm_term", term, setTerm, []]].map(([k, v, set, opts]) => (
          <label key={k as string} className="text-sm">{k as string}
            <input value={v as string} onChange={(e) => (set as (v: string) => void)(e.target.value)} list={`${k}-opts`} className={`${input} mt-1`} />
            {(opts as string[]).length ? <datalist id={`${k}-opts`}>{(opts as string[]).map((o) => <option key={o} value={o} />)}</datalist> : null}
          </label>
        ))}
        <div className="md:col-span-2 rounded-xl bg-black/40 p-4"><code className="break-all text-sm text-sky-300">{url}</code>
          <div className="mt-3"><Button type="button" onClick={copy}>{copied ? <Check /> : <Copy />}{copied ? "Copiado" : "Copiar URL"}</Button></div>
        </div>
      </CardContent>
    </Card>
  );
}
