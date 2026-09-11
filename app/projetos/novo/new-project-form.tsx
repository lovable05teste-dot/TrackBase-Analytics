"use client";
import { useState } from "react";
import { Check, Copy, Loader2, Plus } from "lucide-react";
import { copyText } from "@/lib/clipboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NewProjectForm() {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ id: string; name: string; publicKey: string; script: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, domain }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error || "Falha ao criar projeto.");
      setResult(b.project ? { ...b.project, script: b.script } : b);
      setName("");
      setDomain("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!result?.script) return;
    setCopyError("");
    if (await copyText(result.script)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } else {
      setCopyError("Não foi possível copiar. Selecione o script e use Ctrl+C.");
    }
  }

  return (
    <div className="grid gap-4">
      <Card className="metric-card">
        <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="size-5 text-violet-300" />Criar projeto de rastreamento</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">Nome do projeto<input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex.: Oferta Principal" className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm" /></label>
            <label className="text-sm">Domínio da página de vendas (opcional)<input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="Ex.: oferta.seusite.com" className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm" /></label>
            <div className="md:col-span-2"><Button type="submit" disabled={loading || !name.trim()}>{loading ? <Loader2 className="animate-spin" /> : <Plus />}Criar projeto</Button></div>
          </form>
          {error ? <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
        </CardContent>
      </Card>
      {result ? (
        <Card className="metric-card border-emerald-400/20">
          <CardHeader><CardTitle className="text-emerald-200">Projeto criado: {result.name}</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-slate-400">Instale o script na página de vendas para começar a capturar AdClick, PageView, ViewContent e InitiateCheckout.</p>
            <code className="block break-all rounded-lg bg-black/40 p-3 text-sky-300">{result.script}</code>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={copy}>{copied ? <Check /> : <Copy />}{copied ? "Copiado" : "Copiar script"}</Button>
              <a href="/integracoes" className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5">Ir para Integrações</a>
            </div>
            {copyError ? <p role="alert" className="text-sm text-amber-300">{copyError}</p> : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
