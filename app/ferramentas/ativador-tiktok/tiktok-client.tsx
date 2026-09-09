"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TiktokClient() {
  const [pixelId, setPixelId] = useState("");
  const [copied, setCopied] = useState(false);
  const snippet = `<!-- TikTok Pixel + TrackBase -->
<script>!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e){var n="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=n;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=e;var o=document.createElement("script");o.type="text/javascript";o.async=!0;o.src=n+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${pixelId || "SEU_PIXEL_ID"}');ttq.page();}(window,document,'ttq');</script>`;
  async function copy() { await navigator.clipboard.writeText(snippet); setCopied(true); setTimeout(() => setCopied(false), 1500); }
  return (
    <Card className="metric-card">
      <CardHeader><CardTitle>Ativador Pixel TikTok</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <label className="block text-sm">TikTok Pixel ID<input value={pixelId} onChange={(e) => setPixelId(e.target.value.replace(/\D/g, ""))} placeholder="Ex.: D0XXXX..." className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm" /></label>
        <pre className="overflow-x-auto rounded-lg bg-black/40 p-4 text-xs leading-6 text-sky-300">{snippet}</pre>
        <div className="flex gap-2">
          <Button type="button" onClick={copy}>{copied ? <Check /> : <Copy />}{copied ? "Copiado" : "Copiar snippet"}</Button>
          <a href="/ferramentas/utm-builder" className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5">Gerar UTM tiktok →</a>
        </div>
        <p className="text-xs text-slate-500">Use junto ao tracker TrackBase. Eventos TT + Purchase do gateway permitem comparar Meta × TikTok em /atribuicao.</p>
      </CardContent>
    </Card>
  );
}
