"use client";
import { useState } from "react";
import { Check, Copy, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WebhooksClient() {
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [payload, setPayload] = useState('{\n  "id": "TX123",\n  "status": "approved",\n  "amount": 197.0,\n  "tracking": { "utm_campaign": "CBO_TESTE", "fbclid": "abc" }\n}');
  const [resp, setResp] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function test() {
    setLoading(true);
    setResp("");
    try {
      const target = url || `${location.origin}/api/webhooks/gateway`;
      const r = await fetch(target, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: payload });
      const t = await r.text();
      setResp(`${r.status} ${r.statusText}\n${t}`);
    } catch (e) {
      setResp(e instanceof Error ? e.message : "Falha");
    } finally {
      setLoading(false);
    }
  }

  const doc = `POST {BASE}/api/webhooks/gateway\nAuthorization: Bearer tb_live_...\nContent-Type: application/json`;
  async function copyDoc() { await navigator.clipboard.writeText(doc); setCopied(true); setTimeout(() => setCopied(false), 1200); }

  return (
    <div className="grid gap-4">
      <Card className="metric-card">
        <CardHeader><CardTitle>Webhooks — testar envio</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">Webhook URL<input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://seu-app/api/webhooks/gateway" className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm" /></label>
            <label className="text-sm">Token (tb_live_...)<input value={token} onChange={(e) => setToken(e.target.value)} placeholder="tb_live_..." className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm" /></label>
          </div>
          <label className="text-sm">Payload JSON<textarea value={payload} onChange={(e) => setPayload(e.target.value)} rows={7} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-xs" /></label>
          <div><Button onClick={test} disabled={loading}><Send className="size-4" />{loading ? "Enviando..." : "Enviar teste"}</Button></div>
          {resp ? <pre className="overflow-x-auto rounded-lg bg-black/40 p-4 text-xs text-emerald-200">{resp}</pre> : null}
        </CardContent>
      </Card>
      <Card className="metric-card">
        <CardHeader><CardTitle>Formato universal</CardTitle></CardHeader>
        <CardContent><pre className="rounded-lg bg-black/40 p-4 text-xs leading-6 text-sky-300">{doc}</pre><Button variant="outline" size="sm" className="mt-3" onClick={copyDoc}>{copied ? <Check /> : <Copy />}Copiar</Button></CardContent>
      </Card>
    </div>
  );
}
