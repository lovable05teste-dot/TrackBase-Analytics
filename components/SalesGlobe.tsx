"use client";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { Globe2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { COUNTRIES, countryCode, flagEmoji } from "@/lib/country-geo";

type Row = { name: string; sales: number; value: number };
type Spot = { code: string | null; name: string; sales: number; value: number };

const money = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v || 0);

// Tema atual = classe "dark" no <html> (definida pelo script do layout).
function subscribeTheme(notify: () => void) {
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}
const isDark = () => document.documentElement.classList.contains("dark");

// Ângulos do globo para deixar um ponto (lat, lng) de frente.
const facing = (lat: number, lng: number): [number, number] => [Math.PI - ((lng * Math.PI) / 180 - Math.PI / 2), (lat * Math.PI) / 180];

export function SalesGlobe({ rows }: { rows: Row[] }) {
  const dark = useSyncExternalStore(subscribeTheme, isDark, () => true);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Junta as linhas pelo país reconhecido ("Brasil" e "BR" viram uma só).
  const spots = useMemo<Spot[]>(() => {
    const byCode = new Map<string, Spot>();
    for (const r of rows) {
      const code = countryCode(r.name);
      const key = code ?? "??";
      const cur = byCode.get(key) ?? { code, name: code ? COUNTRIES[code].name : "Não informado", sales: 0, value: 0 };
      cur.sales += r.sales;
      cur.value += r.value;
      byCode.set(key, cur);
    }
    return [...byCode.values()].sort((a, b) => b.value - a.value || b.sales - a.sales);
  }, [rows]);

  const located = useMemo(() => spots.filter((s) => s.code), [spots]);
  const totalSales = useMemo(() => located.reduce((t, s) => t + s.sales, 0), [located]);

  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    let globe: { destroy: () => void } | null = null;
    let cancelled = false;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const markers = located.map((s) => {
      const c = COUNTRIES[s.code as string];
      return { location: [c.lat, c.lng] as [number, number], base: 0.035 + 0.07 * (totalSales ? s.sales / totalSales : 0) };
    });
    const first = located[0] ? COUNTRIES[located[0].code as string] : COUNTRIES.BR;
    let [phi, theta] = facing(first.lat, first.lng);
    theta = Math.max(-0.4, Math.min(0.6, theta));
    let width = wrap.offsetWidth;
    const onResize = () => { width = wrap.offsetWidth; };
    window.addEventListener("resize", onResize);
    const started = performance.now();

    import("cobe").then(({ default: createGlobe }) => {
      if (cancelled) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      globe = createGlobe(canvas, {
        devicePixelRatio: dpr,
        width: width * dpr,
        height: width * dpr,
        phi,
        theta,
        dark: dark ? 1 : 0,
        diffuse: dark ? 1.6 : 1.2,
        mapSamples: 16000,
        mapBrightness: dark ? 7 : 8,
        mapBaseBrightness: 0,
        baseColor: dark ? [0.42, 0.42, 0.48] : [1, 1, 1],
        markerColor: dark ? [1, 0.3, 0.42] : [0.9, 0.18, 0.32],
        glowColor: dark ? [0.16, 0.12, 0.2] : [0.92, 0.9, 0.96],
        markers: markers.map((m) => ({ location: m.location, size: m.base })),
        onRender: (state) => {
          const t = (performance.now() - started) / 1000;
          if (!reduce) phi += 0.0025;
          state.phi = phi;
          state.width = width * dpr;
          state.height = width * dpr;
          // Bolinha pulsando no lugar da venda.
          state.markers = markers.map((m, i) => ({ location: m.location, size: reduce ? m.base : m.base * (1 + 0.55 * Math.max(0, Math.sin(t * 2.4 + i * 0.9))) }));
        },
      });
      canvas.style.opacity = "1";
    }).catch(() => {});

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      globe?.destroy();
    };
  }, [dark, located, totalSales]);

  return (
    <Card className="metric-card">
      <CardContent className="p-5">
        <h3 className="flex items-center gap-2 font-semibold"><Globe2 className="size-4 text-[var(--gs-link,#7c3aed)]" aria-hidden="true" />Vendas por país</h3>
        <div className="mt-4 grid items-center gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div ref={wrapRef} className="relative mx-auto aspect-square w-full max-w-[300px]">
            <canvas ref={canvasRef} aria-label="Globo com os países das vendas" className="size-full opacity-0 transition-opacity duration-700" />
            {!located.length && (
              <p className="absolute inset-x-0 bottom-2 text-center text-xs text-muted-foreground">As vendas aparecem no globo quando o país é informado.</p>
            )}
          </div>
          <div className="min-w-0 space-y-2">
            {spots.length ? spots.slice(0, 8).map((s) => (
              <div key={s.code ?? "??"} className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2.5 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="text-base leading-none" aria-hidden="true">{s.code ? flagEmoji(s.code) : "🌐"}</span>
                  <span className="truncate">{s.name}</span>
                </span>
                <b className="whitespace-nowrap tabular-nums">{s.sales} · {money(s.value)}</b>
              </div>
            )) : <p className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">Nenhuma venda no período.</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
