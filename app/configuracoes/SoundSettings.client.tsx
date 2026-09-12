"use client";
import { useEffect, useState } from "react";
import { BellOff, Play, Volume2, VolumeX } from "lucide-react";
import { SALE_SOUNDS, type SoundPrefs } from "@/lib/sound-prefs";
import {
  getSoundPrefs, isAudioBlocked, previewSound, refreshSoundPrefs,
  setSoundPrefs, subscribeAudioBlocked, subscribeSoundPrefs,
} from "@/lib/sale-sounds";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export function SoundSettings() {
  const [pref, setPref] = useState<SoundPrefs>(getSoundPrefs);
  const [blocked, setBlocked] = useState(isAudioBlocked);

  useEffect(() => {
    setPref(getSoundPrefs());
    setBlocked(isAudioBlocked());
    const off1 = subscribeSoundPrefs(setPref);
    const off2 = subscribeAudioBlocked(setBlocked);
    void refreshSoundPrefs();
    return () => { off1(); off2(); };
  }, []);

  const pick = (id: SoundPrefs["selected"]) => {
    setSoundPrefs({ selected: id, enabled: id === "none" ? false : true });
    if (id !== "none") previewSound(id);
  };

  return (
    <Card className="metric-card" id="som">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="size-5" />
          Som de venda <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-normal text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">{SALE_SOUNDS.length} sons</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-slate-600">
          O som escolhido toca quando uma venda aprovada chegar com o painel aberto. A escolha vale em qualquer dispositivo que você entrar.
        </p>
        {blocked && pref.enabled && pref.selected !== "none" && (
          <p role="alert" className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3.5 py-2.5 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
            O navegador bloqueou o áudio antes do primeiro clique. Clique em Testar em qualquer som abaixo para ativar — depois disso as vendas tocam normalmente.
          </p>
        )}
        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium">
          <span className="inline-flex items-center gap-2">{pref.enabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />} Som ligado</span>
          <Switch checked={pref.enabled} onCheckedChange={(v) => setSoundPrefs({ enabled: v })} />
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          {SALE_SOUNDS.map((s) => {
            const active = pref.selected === s.id && pref.enabled;
            return (
              <div key={s.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${active ? "border-blue-400/40 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}>
                <button type="button" onClick={() => pick(s.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-pressed={pref.selected === s.id}>
                  <span className="text-lg leading-none">{s.icon}</span>
                  <span className="min-w-0 flex-1"><b className="block font-medium">{s.name}</b><small className="block truncate text-xs opacity-70">{s.desc}</small></span>
                  {active && <span className="size-1.5 shrink-0 rounded-full bg-blue-600" />}
                </button>
                <Button type="button" variant="outline" size="sm" onClick={() => previewSound(s.id)} aria-label={`Testar ${s.name}`}>
                  <Play className="size-3.5" /> Testar
                </Button>
              </div>
            );
          })}
          <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${pref.selected === "none" ? "border-blue-400/40 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}>
            <button type="button" onClick={() => pick("none")} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-pressed={pref.selected === "none"}>
              <span className="text-lg leading-none"><BellOff className="size-4" /></span>
              <span className="min-w-0 flex-1"><b className="block font-medium">Nenhum</b><small className="block truncate text-xs opacity-70">Modo silencioso.</small></span>
              {pref.selected === "none" && <span className="size-1.5 shrink-0 rounded-full bg-blue-600" />}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm"><span className="font-medium">Volume</span><b className="tabular-nums">{Math.round(pref.volume * 100)}%</b></div>
          <input
            type="range" min={0} max={100} step={5} value={Math.round(pref.volume * 100)}
            onChange={(e) => setSoundPrefs({ volume: Number(e.target.value) / 100 })}
            className="w-full accent-blue-600" aria-label="Volume do som de venda"
          />
        </div>
        <p className="text-xs text-slate-500">Arquivos leves em /sounds, pré-carregados após a página abrir. Contas novas começam no mudo — ative aqui quando quiser.</p>
      </CardContent>
    </Card>
  );
}
