"use client";
import { useEffect } from "react";
import { playFromWorker } from "@/lib/sale-sounds";

// O push de venda chega pelo service worker, que pede para a página aberta
// tocar o som escolhido. Fica no layout para funcionar em qualquer tela.
export function SaleSoundBridge() {
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const m = e.data;
      if (m && m.type === "play-sale-sound") playFromWorker(m.soundId, m.enabled);
    };
    try { if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", onMessage); } catch {}
    return () => { try { if ("serviceWorker" in navigator) navigator.serviceWorker.removeEventListener("message", onMessage); } catch {} };
  }, []);
  return null;
}
