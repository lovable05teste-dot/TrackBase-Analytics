// Celebrator global de venda aprovada. Montado no layout raiz: faz polling de
// /api/purchases/latest (Purchase events), deduplica por id e dispara:
//  - toast visual (Sonner) se `prefs.toast` estiver ligado — independente do som;
//  - som (lib/sale-sounds, com debounce de rajada/eleição de aba) se o som estiver ligado.
// Em páginas anônimas a API responde 401: após a 1ª chamada o polling é encerrado.
"use client";
import { useEffect, useRef, useState } from "react";
import { getSoundPrefs, notifyApprovedSales, subscribeSoundPrefs } from "@/lib/sale-sounds";
import { showSaleToast } from "@/lib/sales-toast";
import type { SoundPrefs } from "@/lib/sound-prefs";

const POLL_MS = 5000;

type Purchase = {
  id: string;
  eventId: string;
  value: number | null;
  currency: string | null;
  occurredAt: number;
  utmCampaign: string | null;
  utmContent: string | null;
  projectName: string | null;
};

export function SoundNotifications() {
  const [pref, setPref] = useState<SoundPrefs>(getSoundPrefs);
  // Refs p/ o polling reutilizar o estado mais novo sem reiniciar o intervalo.
  const prefRef = useRef(pref); prefRef.current = pref;
  const seen = useRef<Record<string, boolean>>({});
  const authOk = useRef(true);

  useEffect(() => {
    const off = subscribeSoundPrefs(setPref);
    return off;
  }, []);

  useEffect(() => {

    const poll = async (seed: boolean) => {
      if (!authOk.current) return;
      try {
        const r = await fetch("/api/purchases/latest", { cache: "no-store" });
        if (r.status === 401) { authOk.current = false; return; } // anônimo: nunca mais polla
        if (!r.ok) return;
        const data = (await r.json()) as { purchases?: Purchase[] };
        const purchases = Array.isArray(data.purchases) ? data.purchases : [];

        if (seed) {
          // Primeira execução: só marca o que já existe, sem celebrar histórico.
          for (const p of purchases) seen.current[p.id] = true;
          return;
        }

        const p = prefRef.current;
        const wantToast = p.toast;
        const wantSound = p.enabled && p.selected !== "none";
        const fresh = purchases.filter((x) => !seen.current[x.id]);

        for (const x of fresh) {
          seen.current[x.id] = true;
          if (wantToast) {
            showSaleToast({
              value: x.value,
              currency: x.currency,
              product: x.utmContent || undefined,
              campaign: x.utmCampaign || undefined,
              project: x.projectName || undefined,
            });
          }
        }
        if (wantSound && fresh.length) {
          // Rajada em 1 toque; eleição de aba cuidada pelo player.
          notifyApprovedSales(fresh.map((x) => x.id));
        }
      } catch {}
    };

    void poll(true);
    const iv = setInterval(() => void poll(false), POLL_MS);
    return () => clearInterval(iv);
  }, []);

  return null;
}