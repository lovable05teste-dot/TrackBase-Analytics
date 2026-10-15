"use client";
import { useEffect, useState } from "react";
import { VolumeX } from "lucide-react";
import { getSoundPrefs, needsAudioGesture, playFromWorker, subscribeAudioBlocked, subscribeSoundPrefs } from "@/lib/sale-sounds";

// O push de venda chega pelo service worker, que pede para a página aberta
// tocar o som escolhido. Fica no layout para funcionar em qualquer tela.
// O navegador só deixa tocar som depois de um clique na página: enquanto
// isso não acontece, mostra um aviso para o usuário liberar.
export function SaleSoundBridge() {
  const [needsClick, setNeedsClick] = useState(false);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const m = e.data;
      if (m && m.type === "play-sale-sound") playFromWorker();
    };
    try { if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", onMessage); } catch {}
    return () => { try { if ("serviceWorker" in navigator) navigator.serviceWorker.removeEventListener("message", onMessage); } catch {} };
  }, []);

  useEffect(() => {
    // Só em telas logadas: a página de login e a landing não tocam venda.
    let logged = false;
    const check = () => setNeedsClick(logged && getSoundPrefs().enabled && needsAudioGesture());
    const t = setTimeout(() => {
      fetch("/api/notifications/sound", { cache: "no-store" }).then((r) => { logged = r.ok; check(); }).catch(() => {});
    }, 1500);
    const offPrefs = subscribeSoundPrefs(check);
    const offBlocked = subscribeAudioBlocked(check);
    const onGesture = () => setTimeout(check, 0);
    window.addEventListener("pointerdown", onGesture, true);
    window.addEventListener("keydown", onGesture, true);
    return () => { clearTimeout(t); offPrefs(); offBlocked(); window.removeEventListener("pointerdown", onGesture, true); window.removeEventListener("keydown", onGesture, true); };
  }, []);

  if (!needsClick) return null;
  return (
    <button
      type="button"
      onClick={() => setNeedsClick(false)}
      className="fixed bottom-4 right-4 z-[60] flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-lg transition hover:bg-muted"
    >
      <VolumeX className="size-4 shrink-0 text-amber-500" />
      Clique para ativar o som das vendas
    </button>
  );
}
