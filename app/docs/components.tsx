export function Code({ children, lang }: { children: string; lang: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/30">
      <div className="flex justify-between border-b border-white/8 px-4 py-2 text-xs text-slate-500"><span>{lang}</span><span className="text-slate-600">TrackBase</span></div>
      <pre className="p-4 text-xs leading-6 text-sky-200">
        <code>{children}</code>
      </pre>
    </div>
  );
}

export function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 text-sm font-medium text-slate-200">{children}</h3>;
}

export function Box({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "ok" | "warn" | "danger" }) {
  const styles: Record<typeof tone, string> = {
    info: "border-sky-400/20 bg-sky-500/[.06] text-sky-200",
    ok: "border-emerald-400/20 bg-emerald-500/[.06] text-emerald-200",
    warn: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    danger: "border-red-500/30 bg-red-500/10 text-red-200",
  };
  return <div className={`rounded-xl border p-4 text-sm leading-6 ${styles[tone]}`}>{children}</div>;
}

export function Table({ head, rows }: { head: string[]; rows: (string | string[])[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20">
      <table className="w-full min-w-[640px] text-sm">
        <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className="font-normal">{Array.isArray(c) ? c.map((x) => <code key={x} className="mr-1 inline-block rounded bg-black/30 px-1.5 py-0.5 text-xs text-violet-300">{x}</code>) : c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-sm font-semibold text-violet-300 ring-1 ring-violet-400/30">{n}</div>
      <div className="min-w-0 flex-1 space-y-3 pb-2">
        <h4 className="pt-1 font-medium text-slate-200">{title}</h4>
        {children}
      </div>
    </div>
  );
}