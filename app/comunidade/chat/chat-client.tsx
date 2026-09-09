"use client";
import { useEffect, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Msg = { id: string; name: string; text: string; at: string };
const KEY = "tb_community_chat";

export function ChatClient() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  useEffect(() => { try { setMsgs(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { setMsgs([]); } }, []);
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(msgs.slice(-100))); }, [msgs]);
  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setMsgs((m) => [...m, { id: crypto.randomUUID(), name: name.trim() || "Anônimo", text: text.trim(), at: new Date().toLocaleString("pt-BR") }]);
    setText("");
  }
  return (
    <div className="grid gap-4">
      <Card className="metric-card">
        <CardHeader><CardTitle className="flex items-center gap-2"><MessageCircle className="size-5 text-violet-300" />Chat e Clubes</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-slate-400">Clubes por nível: Iniciante, Escala e Black Belt. O chat local é salvo neste navegador (MVP). Conecte depois Discord/WhatsApp.</p>
          <div className="flex flex-wrap gap-2">
            {["Clube Iniciante", "Clube Escala", "Clube Black Belt"].map((c) => <span key={c} className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-200">{c}</span>)}
          </div>
        </CardContent>
      </Card>
      <div className="metric-card rounded-xl p-5">
        <div className="mb-4 max-h-[380px] space-y-3 overflow-y-auto">
          {msgs.length ? msgs.map((m) => (
            <div key={m.id} className="rounded-lg bg-white/[.03] p-3"><div className="flex justify-between text-xs text-slate-500"><b className="text-slate-200">{m.name}</b><span>{m.at}</span></div><p className="mt-1 text-sm">{m.text}</p></div>
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
