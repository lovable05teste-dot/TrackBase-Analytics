"use client";
import { useEffect, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Msg = { id: string; name: string; text: string; createdAt: number };

export function ChatClient() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const r = await fetch("/api/community/chat", { cache: "no-store" });
      const v = await r.json();
      if (r.ok) setMsgs(v.msgs || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const r = await fetch("/api/community/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, text }) });
    if (r.ok) {
      setText("");
      await load();
    }
  }
  return (
    <div className="grid gap-4">
      <Card className="metric-card">
        <CardHeader><CardTitle className="flex items-center gap-2"><MessageCircle className="size-5 text-violet-300" />Chat e Clubes</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-slate-400">Clubes por nível: Iniciante, Escala e Black Belt. Chat em tempo real com todos os gestores (atualiza a cada 15s).</p>
          <div className="flex flex-wrap gap-2">
            {["Clube Iniciante", "Clube Escala", "Clube Black Belt"].map((c) => <span key={c} className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-200">{c}</span>)}
          </div>
        </CardContent>
      </Card>
      <div className="metric-card rounded-xl p-5">
        <div className="mb-4 max-h-[380px] space-y-3 overflow-y-auto">
          {loading ? <p className="py-6 text-center text-sm text-slate-500">Carregando...</p>
            : msgs.length ? msgs.map((m) => (
              <div key={m.id} className="rounded-lg bg-white/[.03] p-3"><div className="flex justify-between text-xs text-slate-500"><b className="text-slate-200">{m.name}</b><span>{new Date(m.createdAt * 1000).toLocaleString("pt-BR")}</span></div><p className="mt-1 text-sm">{m.text}</p></div>
            )) : <p className="py-6 text-center text-sm text-slate-500">Seja o primeiro a postar um insight de hoje.</p>}
        </div>
        <form onSubmit={send} className="flex flex-col gap-2 sm:flex-row">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm sm:w-44" />
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Compartilhe um teste, criativo, métrica..." className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm" />
          <Button type="submit" size="sm"><Send className="size-4" />Enviar</Button>
        </form>
      </div>
    </div>
  );
}
