"use client";
import { useEffect, useState } from "react";
import { Ban, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const KEY = "tb_ip_blacklist";

export function BlacklistClient() {
  const [list, setList] = useState<string[]>([]);
  const [ip, setIp] = useState("");
  const [ready, setReady] = useState(false);
  const [formError, setFormError] = useState("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setList(JSON.parse(raw));
    } catch { /* mantém vazio */ } finally { setReady(true); }
  }, []);
  useEffect(() => { if (!ready) return; try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* sem persistência */ } }, [list, ready]);
  const validIp = (v: string) =>
    /^\d{1,3}(\.\d{1,3}){3}$/.test(v) && v.split(".").every((n) => Number(n) <= 255) ||
    /^[0-9a-fA-F:]{2,45}$/.test(v) && v.includes(":");
  function add(e: React.FormEvent) {
    e.preventDefault();
    const v = ip.trim();
    setFormError("");
    if (!v || list.includes(v)) return;
    if (!validIp(v)) { setFormError("Digite um IPv4 ou IPv6 válido."); return; }
    setList((l) => [...l, v]);
    setIp("");
  }
  return (
    <div className="grid gap-4">
      <Card className="metric-card">
        <CardHeader><CardTitle className="flex items-center gap-2"><Ban className="size-5 text-red-300" />Blacklist de IP ({list.length})</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-slate-400">IPs aqui são ignorados nas análises e podem ser bloqueados no tracker/Cloudflare. Salvo neste navegador + exportável para o firewall.</p>
          <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row">
            <input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="Ex.: 192.168.0.10 ou 2804:..." aria-label="Endereço IP" className="h-11 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 text-sm" />
            <Button type="submit" size="sm" className="h-11"><Plus className="size-4" />Adicionar</Button>
          </form>
          {formError ? <p role="alert" className="mt-2 text-sm text-red-400">{formError}</p> : null}
        </CardContent>
      </Card>
      <div className="metric-card overflow-hidden rounded-xl">
        <table className="w-full text-sm">
          <thead><tr><th>IP</th><th>Ação</th></tr></thead>
          <tbody>
            {list.length ? list.map((v) => (
              <tr key={v}><td className="font-mono">{v}</td><td><button onClick={() => setList((l) => l.filter((x) => x !== v))} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-red-300"><Trash2 className="size-4" /></button></td></tr>
            )) : <tr><td colSpan={2} className="py-8 text-center text-slate-500">Nenhum IP bloqueado.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
