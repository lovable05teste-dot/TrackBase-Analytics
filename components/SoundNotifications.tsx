"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { playSound } from "@/lib/sounds";

type Purchase = { id: string; eventId: string; value: number | null; currency: string | null; occurredAt: number; utmCampaign: string | null };
type Prefs = { selected: string; enabled: boolean };

const STORAGE = "trackbase:notification";
const DEFAULTS: Prefs = { selected: "ka-ching", enabled: true };

function readPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (raw) {
      const p = JSON.parse(raw);
      return { selected: p.selected || DEFAULTS.selected, enabled: typeof p.enabled === "boolean" ? p.enabled : DEFAULTS.enabled };
    }
  } catch {}
  return DEFAULTS;
}

const brl = (v: number | null, c: string | null) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: c || "BRL" }).format(v || 0);

export function SoundNotifications() {
  const [lastPurchase, setLastPurchase] = useState<Purchase | null>(null);
  const [showToast, setShowToast] = useState(false);
  const seen = useRef<Record<string, boolean>>({});
  const initialized = useRef(false);
  const pollMs = 5000;

  const poll = useCallback(async () => {
    try {
      const pref = readPrefs();
      if (!pref.enabled) return;
      const r = await fetch("/api/purchases/latest");
      const data = await r.json();
      const purchases: Purchase[] = data.purchases || [];
      if (!initialized.current) {
        initialized.current = true;
        for (const p of purchases) seen.current[p.id] = true;
        return;
      }
      for (const p of purchases) {
        if (seen.current[p.id]) continue;
        seen.current[p.id] = true;
        playSound(pref.selected);
        setLastPurchase(p);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 6000);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const t = setTimeout(poll, 3500);
    const iv = setInterval(poll, pollMs);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, [poll]);

  return (
    <>
      {showToast && lastPurchase && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-[#0b0e17]/95 p-4 shadow-2xl backdrop-blur">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-xl">💰</div>
          <div>
            <p className="text-sm font-semibold text-emerald-200">Nova venda!</p>
            <p className="text-xs text-slate-400">{brl(lastPurchase.value, lastPurchase.currency)}</p>
            {lastPurchase.utmCampaign && <p className="mt-0.5 text-xs text-slate-500">{lastPurchase.utmCampaign}</p>}
          </div>
          <button onClick={() => setShowToast(false)} className="ml-2 text-slate-500 hover:text-white">✕</button>
        </div>
      )}
    </>
  );
}