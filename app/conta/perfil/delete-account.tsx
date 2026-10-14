"use client";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/plan-client";

// Exclusão definitiva da conta: senha + digitar EXCLUIR. Apaga projetos,
// vendas, contas de anúncio e a própria conta.
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await apiFetch("/api/account/delete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password, confirm }) });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error || "Não foi possível excluir a conta.");
      window.location.href = "/login";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível excluir a conta.");
      setBusy(false);
    }
  };

  return (
    <div className="metric-card rounded-xl border border-red-500/30 p-5 md:col-span-2">
      <b className="flex items-center gap-2 text-red-600"><AlertTriangle className="size-4" />Excluir minha conta</b>
      <p className="mt-2 text-sm text-slate-500">Apaga para sempre seus projetos, vendas, clientes, contas de anúncio conectadas e o seu acesso. Não dá para desfazer. Os registros de pagamento ficam guardados pelo prazo que a lei fiscal exige. Se tiver assinatura ativa, cancele com o suporte antes.</p>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="mt-4 rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-600 hover:bg-red-500/10">Quero excluir minha conta</button>
      ) : (
        <div className="mt-4 grid gap-3 sm:max-w-md">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha atual" autoComplete="current-password" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#111113]" />
          <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder='Digite EXCLUIR para confirmar' className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#111113]" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={submit} disabled={busy || !password || confirm !== "EXCLUIR"} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? "Excluindo…" : "Excluir definitivamente"}</button>
            <button type="button" onClick={() => { setOpen(false); setError(""); }} className="rounded-lg border border-slate-200 px-4 py-2 text-sm dark:border-white/10">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
