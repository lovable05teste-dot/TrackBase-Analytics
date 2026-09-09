"use client";
import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type F = { id: string; type: string; text: string; at: string };
const KEY = "tb_feedback";

export function FeedbackClient() {
  const [type, setType] = useState("Sugestão");
  const [text, setText] = useState("");
  const [list, setList] = useState<F[]>([]);
  useEffect(() => { try { setList(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { setList([]); } }, []);
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(list.slice(-50))); }, [list]);
  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setList((l) => [...l, { id: crypto.randomUUID(), type, text: text.trim(), at: new Date().toLocaleString("pt-BR") }]);
    setText("");
  }
  return (
    <div className="grid gap-4">
      <Card className="metric-card">
        <CardHeader><CardTitle>Feedback</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={send} className="grid gap-3">
            <div className="flex gap-2">{["Sugestão", "Bug", "Elogio"].map((t) => <button key={t} type="button" onClick={() => setType(t)} className={`rounded-lg border px-3 py-2 text-sm ${type === t ? "border-violet-400/40 bg-violet-500/15 text-violet-200" : "border-white/10 text-slate-400"}`}>{t}</button>)}</div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Conte o que melhorar, o que quebrou ou o que amou..." className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm" />
            <div><Button type="submit" size="sm"><Send className="size-4" />Enviar feedback</Button></div>
          </form>
        </CardContent>
      </Card>
      <div className="space-y-2">
        {list.length ? [...list].reverse().map((f) => <div key={f.id} className="metric-card rounded-xl p-4"><div className="flex justify-between text-xs text-slate-500"><b className="text-violet-200">{f.type}</b><span>{f.at}</span></div><p className="mt-1 text-sm">{f.text}</p></div>) : <p className="py-4 text-center text-sm text-slate-500">Nenhum feedback ainda.</p>}
      </div>
    </div>
  );
}
