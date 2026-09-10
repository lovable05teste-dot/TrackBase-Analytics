"use client";
import { useEffect, useState } from "react";
import { Ban, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Row = { id: string; ip: string; reason: string | null; createdAt: number };

export function BlacklistClient() {
  const [list, setList] = useState<Row[]>([]);
  const [ip, setIp] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/security/blocklist", { cache: "no-store" });
      const v = await r.json();
      if (!r.ok) throw new Error(v.error || "Falha ao carregar.");
      setList(v.ips || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const v = ip.trim();
    if (!v) return;
    try {
      const r = await fetch("/api/security/blocklist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ip: v, reason }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Falha ao adicionar.");
      setIp("");
      setReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao adicionar.");
    }
  }

  async function remove(id: string) {
    await fetch(`/api/security/blocklist?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="grid gap-4">
      <Card className="metric-card">
        <CardHeader><CardTitle className="flex items-center gap-2"><Ban className="size-5 text-red-300" />Blacklist de IP ({list.length})</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-slate-400">IPs aqui são bloqueados de verdade no servidor: eventos do tracker vindos desses IPs são descartados e não entram nas análises. Bots conhecidos também são filtrados automaticamente.</p>
          {error && <p className="mb-3 rounded-lg border border-red-400/30 p-3 text-sm text-red-300">{error}</p>}
          <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row">
            <input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="Ex.: 192.168.0.10 ou 2804:..." className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm" />
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (opcional)" className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm sm:max-w-52" />
            <Button type="submit" size="sm"><Plus className="size-4" />Adicionar</Button>
          </form>
        </CardContent>
      </Card>
      <div className="metric-card overflow-hidden rounded-xl">
        <table className="w-full text-sm">
          <thead><tr><th className="p-3 text-left">IP</th><th className="p-3 text-left">Motivo</th><th className="p-3 text-right">Ação</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={3} className="py-8 text-center text-slate-500">Carregando...</td></tr>
              : list.length ? list.map((v) => (
                <tr key={v.id} className="border-t border-white/10"><td className="p-3 font-mono">{v.ip}</td><td className="p-3 text-slate-400">{v.reason || "—"}</td><td className="p-3 text-right"><button onClick={() => remove(v.id)} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-red-300"><Trash2 className="size-4" /></button></td></tr>
              )) : <tr><td colSpan={3} className="py-8 text-center text-slate-500">Nenhum IP bloqueado.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
