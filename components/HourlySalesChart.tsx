"use client";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent } from "@/components/ui/card";

type Hour = { hour: string; sales: number; revenue: number };

const money = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const COLOR = "#fb7185";

// Bolinha só nas horas que tiveram venda.
function SaleDot(props: { cx?: number; cy?: number; index?: number; payload?: Hour }) {
  const { cx, cy, index, payload } = props;
  if (!payload?.sales || cx == null || cy == null) return <g key={`d${index}`} />;
  return <circle key={`d${index}`} cx={cx} cy={cy} r={4} fill={COLOR} stroke="var(--card)" strokeWidth={2} />;
}

function HourTip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Hour }> }) {
  const h = active && payload?.length ? payload[0].payload : null;
  if (!h) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="font-semibold">{h.hour}</p>
      <p className="mt-1 tabular-nums">{h.sales} {h.sales === 1 ? "venda" : "vendas"} · {money(h.revenue)}</p>
    </div>
  );
}

export function HourlySalesChart({ data }: { data: Hour[] }) {
  const total = data.reduce((t, h) => t + (h.sales || 0), 0);
  const peak = data.reduce<Hour | null>((best, h) => (h.sales > (best?.sales ?? 0) ? h : best), null);
  return (
    <Card className="metric-card">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold">Vendas por horário</h3>
          <p className="text-xs text-muted-foreground">{peak ? `Pico às ${peak.hour} · ${peak.sales} ${peak.sales === 1 ? "venda" : "vendas"}` : "Sem vendas no período"}</p>
        </div>
        <div className="mt-5 h-64" aria-label={`Vendas por horário: ${total} no período`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="gs-hour-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(148,163,184,.12)" />
              <XAxis dataKey="hour" tick={{ fill: "#94a3b8", fontSize: 10 }} interval={2} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<HourTip />} cursor={{ stroke: "rgba(251,113,133,.4)", strokeWidth: 1, strokeDasharray: "4 4" }} />
              <Area type="monotone" dataKey="sales" name="Vendas" stroke={COLOR} strokeWidth={2.5} fill="url(#gs-hour-fill)" dot={SaleDot} activeDot={{ r: 6, strokeWidth: 3, stroke: "var(--card)", fill: COLOR }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
