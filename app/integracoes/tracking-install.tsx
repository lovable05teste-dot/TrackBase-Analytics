"use client";
import { useEffect, useState } from "react";
import { Check, Copy, Loader2, Plus, PlugZap, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";

type Project = { id: string; name: string; domain?: string; publicKey?: string; pixelId?: string; metaConnectedAt?: string };

export function TrackingInstall() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("Minha página de vendas");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState("");
  const [copied, setCopied] = useState("");
  const [connecting, setConnecting] = useState("");
  const [pixelDraft, setPixelDraft] = useState<Record<string, string>>({});
  const [tokenDraft, setTokenDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const load = () =>
    fetch("/api/projects")
      .then((r) => r.json())
      .then((b) => setProjects(b.projects || []))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    setCreating(true);
    try {
      const r = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, domain }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error);
      await load();
    } finally {
      setCreating(false);
    }
  };

  const script = (p: Project) => `<script async src="${location.origin}/tracker.js?key=${p.publicKey || ""}"></script>`;

  const copy = async (p: Project) => {
    if (!p.publicKey) { setError("Este projeto ainda não tem chave pública."); return; }
    if (await copyText(script(p))) {
      setCopied(p.id);
      setTimeout(() => setCopied(""), 1600);
    } else {
      setError("Não foi possível copiar. Selecione o script e use Ctrl+C.");
    }
  };

  const connect = async (p: Project) => {
    setConnecting(p.id);
    setError("");
    try {
      const r = await fetch("/api/meta/connect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId: p.id, pixelId: (pixelDraft[p.id] || "").trim(), accessToken: (tokenDraft[p.id] || "").trim() }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error || "Não foi possível conectar o Pixel.");
      setProjects((ps) => ps.map((x) => (x.id === p.id ? { ...x, pixelId: b.pixelId, metaConnectedAt: new Date().toISOString() } : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao conectar Pixel.");
    } finally {
      setConnecting("");
    }
  };

  const disconnect = async (p: Project) => {
    if (!confirm(`Desconectar o Pixel ${p.pixelId} do projeto "${p.name}"?`)) return;
    setConnecting(p.id);
    setError("");
    try {
      const r = await fetch(`/api/meta/connect?projectId=${encodeURIComponent(p.id)}`, { method: "DELETE" });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error || "Não foi possível desconectar.");
      setProjects((ps) => ps.map((x) => (x.id === p.id ? { ...x, pixelId: undefined, metaConnectedAt: undefined } : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao desconectar.");
    } finally {
      setConnecting("");
    }
  };

  const remove = async (p: Project) => {
    if (!confirm(`Apagar o projeto "${p.name}"? Todos os eventos, vendas e credenciais dele serão apagados.`)) return;
    setDeleting(p.id);
    setError("");
    try {
      const r = await fetch(`/api/projects?id=${encodeURIComponent(p.id)}`, { method: "DELETE" });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error || "Não foi possível apagar.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível apagar.");
    } finally {
      setDeleting("");
    }
  };

  return (
    <div className="space-y-5 border-t border-slate-200 pt-6">
      <div>
        <h3 className="font-semibold">Script global + Pixel da Meta</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          1º cria o projeto, 2º conecta seu Pixel (ID + token) e 3º copia o script abaixo para a sua página. O script
          rastreia acessos, UTMs, checkouts e vendas — e dispara o Pixel do navegador + Conversions API com deduplicação.
        </p>
      </div>
      {loading ? (
        <Loader2 className="animate-spin" />
      ) : (
        <>
          {projects.map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <b>{p.name}</b>
                  {p.domain && <span className="ml-2 text-xs text-slate-500">{p.domain}</span>}
                </div>
                <Button variant="outline" className="text-red-600" disabled={deleting === p.id} onClick={() => remove(p)}>
                  {deleting === p.id ? <Loader2 className="animate-spin" /> : <Trash2 />}Apagar projeto
                </Button>
              </div>
              {p.pixelId ? (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-500/[.06] p-3">
                  <div className="text-sm text-emerald-700">
                    <b>Pixel ativo</b> · {p.pixelId} · navegador + CAPI
                  </div>
                  <Button variant="outline" className="text-red-600" disabled={connecting === p.id} onClick={() => disconnect(p)}>
                    {connecting === p.id ? <Loader2 className="animate-spin" /> : <X />}Desconectar
                  </Button>
                </div>
              ) : (
                <div className="mb-3 grid gap-2 rounded-lg bg-black/20 p-3 md:grid-cols-[1fr_1.4fr_auto]">
                  <div className="min-w-0">
                    <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Pixel ID</p>
                    <input
                      value={pixelDraft[p.id] || ""}
                      onChange={(e) => setPixelDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                      placeholder="123456789012345"
                      className="dashboard-input w-full"
                      disabled={!!connecting}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Token da API de Conversões</p>
                    <input
                      value={tokenDraft[p.id] || ""}
                      onChange={(e) => setTokenDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                      placeholder="EAAB... (do Gerenciador de Eventos)"
                      className="dashboard-input w-full"
                      disabled={!!connecting}
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="self-end"
                    onClick={() => connect(p)}
                    disabled={!((pixelDraft[p.id] || "").trim() && (tokenDraft[p.id] || "").trim()) || connecting === p.id}
                  >
                    {connecting === p.id ? <Loader2 className="animate-spin" /> : <PlugZap />}Conectar Pixel
                  </Button>
                </div>
              )}
              <p className="mb-3 text-xs text-slate-500">
                Pixel ID + token ficam no <b>Gerenciador de Eventos da Meta → Configurações → API de Conversões</b>. O app
                valida na hora contra a Meta.
              </p>
              <code className="block break-all rounded-lg bg-black/30 p-3 text-xs text-sky-300">{script(p)}</code>
              <Button variant="outline" onClick={() => copy(p)}>
                {copied === p.id ? <Check /> : <Copy />}
                {copied === p.id ? "Copiado" : "Copiar script"}
              </Button>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg bg-black/20 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Botão de checkout</p>
                  <code className="break-all text-xs text-violet-300">{'data-trackbase-event="InitiateCheckout" data-value="69.90" data-currency="BRL"'}</code>
                </div>
                <div className="rounded-lg bg-black/20 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Página de obrigado</p>
                  <code className="break-all text-xs text-emerald-300">{'TrackBase.purchase({value:69.90,currency:"BRL",externalId:"PEDIDO_ID"})'}</code>
                </div>
              </div>
            </div>
          ))}
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm leading-6 text-slate-600">
            <b>Como a venda entra:</b> o webhook do gateway é a fonte principal da aprovação. O comando{" "}
            <code className="text-blue-600">TrackBase.purchase</code> pode ser usado na página de obrigado e compartilha o
            mesmo identificador com Pixel/CAPI para evitar duplicidade.
          </div>
          <div className="grid gap-3 rounded-xl border border-dashed border-slate-200 p-4 sm:grid-cols-[1fr_1fr_auto]">
            <input value={name} onChange={(e) => setName(e.target.value)} className="dashboard-input" placeholder="Nome do projeto" />
            <input value={domain} onChange={(e) => setDomain(e.target.value)} className="dashboard-input" placeholder="Domínio da página (opcional)" />
            <Button onClick={create} disabled={creating || !name.trim()}>
              {creating ? <Loader2 className="animate-spin" /> : <Plus />}Criar projeto
            </Button>
          </div>
        </>
      )}
    </div>
  );
}