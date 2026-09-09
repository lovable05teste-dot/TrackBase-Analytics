"use client";
import { useEffect, useState } from "react";
import { Loader2, Volume2 } from "lucide-react";
import { playSound, sounds } from "@/lib/sounds";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const STORAGE = "trackbase:notification";

export function SoundSettings() {
  const [selected, setSelected] = useState("ka-ching");
  const [enabled, setEnabled] = useState(true);
  const [playing, setPlaying] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.selected && sounds.some((s) => s.id === parsed.selected)) setSelected(parsed.selected);
        if (typeof parsed.enabled === "boolean") setEnabled(parsed.enabled);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify({ selected, enabled }));
    } catch {}
  }, [selected, enabled]);

  useEffect(() => {
    const target = document.querySelector("[data-trackbase-enabled]");
    if (target) {
      target.setAttribute("data-trackbase-enabled", enabled ? "1" : "0");
      target.setAttribute("data-trackbase-sound", selected);
    }
    try {
      const root = document.querySelector("html");
      root?.setAttribute("data-notify-sound", selected);
      root?.setAttribute("data-notify-enabled", enabled ? "1" : "0");
    } catch {}
    (window as any).__trackbase_sound = { selected, enabled };
  }, [selected, enabled]);

  const demo = (id: string) => {
    setPlaying(id);
    playSound(id);
    setTimeout(() => setPlaying(""), 1500);
  };

  return (
    <Card className="metric-card" id="som">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="size-5 text-violet-300" />
          Som de venda <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-normal text-violet-300">12 sons</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-slate-400">
          Toque para ouvir. O som escolhido toca sempre que uma venda aprovada (Purchase) chegar enquanto o painel estiver aberto.
        </p>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 accent-violet-500" />
          Habilitar som de vendas
        </label>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sounds.map((s) => (
            <button
              key={s.id}
              onClick={() => { setSelected(s.id); demo(s.id); }}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${selected === s.id ? "border-violet-400/40 bg-violet-500/15 text-violet-200" : "border-white/10 text-slate-300 hover:bg-white/5"}`}
            >
              <span className="text-lg leading-none">{s.icon}</span>
              <span className="flex-1 text-left">{s.name}</span>
              {playing === s.id && <Loader2 className="size-4 animate-spin text-violet-300" />}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">Sem arquivos de áudio — os sons são gerados em tempo real no seu navegador e não consomem tráfego.</p>
      </CardContent>
    </Card>
  );
}