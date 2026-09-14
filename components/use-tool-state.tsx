"use client";
import { useEffect, useState, type SetStateAction } from "react";
import { RefreshCw, Save } from "lucide-react";
import { apiFetch } from "@/lib/plan-client";
import type { ToolKey } from "@/lib/tool-state";

export function useToolState<T>(tool: ToolKey, initial: T) {
  const [data, updateData] = useState<T>(initial), [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [dirty, setDirty] = useState(false);
  const [error, setError] = useState(""), [canEdit, setCanEdit] = useState(false), [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    fetch("/api/tools/state?tool=" + tool, { signal: c.signal, cache: "no-store" }).then(async r => {
      const b = await r.json(); if (!r.ok) throw new Error(b.error || "Falha ao carregar.");
      if (!c.signal.aborted) { updateData(b.data); setRevision(b.revision); setCanEdit(b.canEdit); setDirty(false); setError(""); }
    }).catch(e => { if (!c.signal.aborted) setError(e.message); }).finally(() => { if (!c.signal.aborted) setLoading(false); });
    return () => c.abort();
  }, [tool, refresh]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function setData(next: SetStateAction<T>) { if (loading || saving || !canEdit) return; updateData(next); setDirty(true); }
  async function save() {
    if (loading || saving || !canEdit) return;
    setSaving(true); setError("");
    try {
      const r = await apiFetch("/api/tools/state?tool=" + tool, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ data, revision }) });
      const b = await r.json(); if (!r.ok) throw new Error(b.error || "Falha ao salvar.");
      updateData(b.data); setRevision(b.revision); setDirty(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao salvar."); }
    finally { setSaving(false); }
  }
  function reload() { setLoading(true); setCanEdit(false); setRefresh(n => n + 1); }
  return { data, setData, loading, saving, dirty, error, canEdit, save, reload };
}

export function ToolSaveBar({ state }: { state: { loading: boolean; saving: boolean; dirty: boolean; error: string; canEdit: boolean; save: () => Promise<void>; reload: () => void } }) {
  return <div className="mb-4 rounded-xl border border-border bg-card p-3">
    <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={state.save} disabled={state.loading || state.saving || !state.dirty || !state.canEdit} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm text-white disabled:opacity-40"><Save className="size-4" />{state.saving ? "Salvando…" : "Salvar na minha conta"}</button><button type="button" onClick={state.reload} disabled={state.saving} className="rounded-lg border border-border p-2" aria-label="Recarregar dados salvos"><RefreshCw className="size-4" /></button><span role="status" className="text-xs text-muted-foreground">{state.loading ? "Carregando sua conta…" : state.dirty ? "Alterações ainda não salvas" : state.error ? "Não foi possível confirmar os dados" : "Dados da sua conta carregados"}</span></div>
    {state.error && <p role="alert" className="mt-2 text-sm text-red-500">{state.error}</p>}
    {!state.loading && !state.canEdit && !state.error && <p className="mt-2 text-sm text-muted-foreground">Explore o guia de uso. <a className="text-red-500 underline" href="/planos">Ative um plano que inclua esta ferramenta</a> para salvar suas configurações.</p>}
  </div>;
}
