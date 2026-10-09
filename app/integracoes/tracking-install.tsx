"use client";
import { useEffect, useState } from "react";
import { Check, Copy, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";
import { apiFetch } from "@/lib/plan-client";

type Project = { id: string; name: string; domain?: string; publicKey?: string; pixelId?: string };

// Etapa 1 do passo a passo: projeto + script. O Pixel tem etapa própria
// (antes era conectável aqui e na aba Pixel, o que confundia).
export function TrackingInstall() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState("");
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");

  const load = () =>
    fetch("/api/projects", { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => setProjects(b.projects || []))
      .catch(() => setError("Não foi possível carregar os projetos. Atualize a página."))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setError("");
    try {
      const r = await apiFetch("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: name.trim(), domain: domain.trim() }) });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error || "Não foi possível criar o projeto.");
      setName("");
      setDomain("");
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível criar o projeto.");
    } finally {
      setCreating(false);
    }
  };

  const script = (p: Project) => `<script async src="${location.origin}/tracker.js?key=${p.publicKey || ""}"></script>`;

  const copy = async (p: Project) => {
    setError("");
    if (!p.publicKey) return setError("Este projeto ainda não tem chave pública.");
    if (await copyText(script(p))) {
      setCopied(p.id);
      setTimeout(() => setCopied(""), 1600);
    } else setError("Não foi possível copiar. Selecione o código e use Ctrl+C.");
  };

  const remove = async (p: Project) => {
    if (!confirm(`Apagar o projeto "${p.name}"? Todos os eventos, vendas e credenciais dele serão apagados.`)) return;
    setDeleting(p.id);
    setError("");
    try {
      const r = await apiFetch(`/api/projects?id=${encodeURIComponent(p.id)}`, { method: "DELETE" });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error || "Não foi possível apagar.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível apagar.");
    } finally {
      setDeleting("");
    }
  };

  if (loading) return <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" />Carregando projetos…</div>;

  const form = (
    <form onSubmit={create} className="grid gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label className="text-sm font-medium text-slate-700">Nome do projeto
        <input value={name} onChange={(e) => setName(e.target.value)} className="dashboard-input mt-1.5 w-full" placeholder="Ex.: Loja principal" required />
      </label>
      <label className="text-sm font-medium text-slate-700">Domínio do site <span className="font-normal text-slate-500">(opcional)</span>
        <input value={domain} onChange={(e) => setDomain(e.target.value)} className="dashboard-input mt-1.5 w-full" placeholder="minhaloja.com.br" />
      </label>
      <Button className="h-11" disabled={creating || !name.trim()}>{creating ? <Loader2 className="animate-spin" /> : <Plus />}Criar projeto</Button>
    </form>
  );

  return (
    <div className="space-y-4">
      {projects.length === 0 ? (
        <>
          <p className="text-sm leading-6 text-slate-600">Um projeto representa um site ou funil. Dê um nome e a GhostScale gera o código para instalar.</p>
          {form}
        </>
      ) : (
        <>
          <ol className="list-decimal space-y-1 pl-5 text-sm leading-6 text-slate-600">
            <li>Copie o código do projeto.</li>
            <li>Cole antes de <code className="text-blue-600">&lt;/head&gt;</code> em todas as páginas (ou no campo &quot;scripts do cabeçalho&quot; do seu construtor de site).</li>
            <li>Abra a página uma vez: o status desta etapa muda para <b>Concluído</b>.</li>
          </ol>
          {projects.map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <b className="break-words">{p.name}</b>
                  {p.domain && <span className="ml-2 text-xs text-slate-500">{p.domain}</span>}
                </div>
                <Button variant="ghost" size="sm" className="text-red-600" disabled={deleting === p.id} onClick={() => remove(p)}>
                  {deleting === p.id ? <Loader2 className="animate-spin" /> : <Trash2 />}Apagar
                </Button>
              </div>
              <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <code className="block min-w-0 break-all rounded-lg bg-slate-50 p-3 text-xs leading-5 text-blue-600">{script(p)}</code>
                <Button className="h-11" onClick={() => copy(p)}>{copied === p.id ? <><Check />Copiado</> : <><Copy />Copiar código</>}</Button>
              </div>
            </div>
          ))}
          {showForm ? form : <Button variant="outline" onClick={() => setShowForm(true)}><Plus />Novo projeto</Button>}
          <details className="rounded-xl border border-slate-200 bg-slate-50 text-sm">
            <summary className="flex min-h-11 cursor-pointer items-center px-4 font-medium text-slate-600">Para desenvolvedores: eventos manuais</summary>
            <div className="grid gap-3 border-t border-slate-200 p-4 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Botão de checkout</p>
                <code className="break-all text-xs text-violet-700">{'data-trackbase-event="InitiateCheckout" data-value="69.90" data-currency="BRL"'}</code>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Evento via JavaScript</p>
                <code className="break-all text-xs text-emerald-700">{'TrackBase.lead({value:0,currency:"BRL"})'}</code>
              </div>
              <p className="text-xs leading-5 text-slate-500 md:col-span-2">A compra (Purchase) é confirmada pelo webhook do gateway na etapa 4, não pela página.</p>
            </div>
          </details>
        </>
      )}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
