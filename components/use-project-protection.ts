"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ProtectionConfig } from "@/lib/protection";
import { apiFetch } from "@/lib/plan-client";

export type ProtectedProject = { id: string; name: string; domain: string | null; publicKey: string | null };
export type ProtectionData = { project: ProtectedProject; config: ProtectionConfig; blockedIps: string[]; revision: number; reports: { eventName: string; occurredAt: number; host: string; reason: string; mode: string }[] };
export function useProjectProtection() {
  const [projects, setProjects] = useState<ProtectedProject[]>([]), [projectId, setProjectId] = useState("");
  const [data, setData] = useState<ProtectionData | null>(null), [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false), [error, setError] = useState(""), [refresh, setRefresh] = useState(0);
  const selected = useRef(projectId);
  useEffect(() => { selected.current = projectId; }, [projectId]);
  useEffect(() => {
    const c = new AbortController();
    fetch("/api/projects", { signal: c.signal, cache: "no-store" }).then(async r => {
      const b = await r.json(); if (!r.ok) throw new Error(b.error || "Falha ao carregar projetos.");
      setProjects(b.projects || []); setProjectId(v => v || b.projects?.[0]?.id || "");
      if (!b.projects?.length) setLoading(false);
    }).catch(e => { if (!c.signal.aborted) { setError(e.message); setLoading(false); } });
    return () => c.abort();
  }, []);
  useEffect(() => {
    if (!projectId) return;
    const c = new AbortController();
    fetch("/api/projects/protection?projectId=" + encodeURIComponent(projectId), { signal: c.signal, cache: "no-store" }).then(async r => {
      const b = await r.json(); if (!r.ok) throw new Error(b.error || "Falha ao carregar regras.");
      if (!c.signal.aborted) { setData(b); setError(""); setLoading(false); }
    }).catch(e => { if (!c.signal.aborted) { setData(null); setError(e.message); setLoading(false); } });
    return () => c.abort();
  }, [projectId, refresh]);
  const reload = useCallback(() => { setLoading(true); setRefresh(n => n + 1); }, []);
  const selectProject = (id: string) => { selected.current = id; setProjectId(id); setData(null); setLoading(true); setError(""); };
  async function save(method: "PUT" | "PATCH", body: object) {
    if (!data || data.project.id !== projectId || saving) return false;
    const target = projectId; setSaving(true); setError("");
    try {
      const r = await apiFetch("/api/projects/protection?projectId=" + encodeURIComponent(target), { method, headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, revision: data.revision }) });
      const b = await r.json(); if (!r.ok) throw new Error(b.error || "Não foi possível salvar.");
      if (selected.current === target) setData(v => v && v.project.id === target ? { ...v, ...b } : v);
      return true;
    } catch (e) { if (selected.current === target) setError(e instanceof Error ? e.message : "Falha ao salvar."); return false; }
    finally { setSaving(false); }
  }
  return { projects, projectId, data: data?.project.id === projectId ? data : null, loading, saving, error, setError, selectProject, reload, save };
}
