"use client";
import { useEffect, useState } from "react";
import { Ban, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const KEY = "tb_ip_blacklist";

export function BlacklistClient() {
  const [list, setList] = useState<string[]>([]);
  const [ip, setIp] = useState("");
  useEffect(() => { try { setList(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { setList([]); } }, []);
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(list)); }, [list]);
  function add(e: React.FormEvent) {
    e.preventDefault();
    const v = ip.trim();
    if (!v || list.includes(v)) return;
    setList((l) => [...l, v]);
    setIp("");
  }
  return (
    <div className="grid gap-4">
      <Card className="metric-card">
        <CardHeader><CardTitle className="flex items-center gap-2"><Ban className="size-5 text-red-300" />Blacklist de IP ({list.length})</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-slate-400">IPs aqui são ignorados nas análises e podem ser bloqueados no tracker/Cloudflare. Salvo neste navegador + exportável para o firewall.</p>
          <form onSubmit={add} className="flex gap-2">
            <input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="Ex.: 192.168.0.10 ou 2804:..." className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm" />
            <Button type="submit" size="sm"><Plus className="size-4" />Adicionar</Button>
          </form>
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
