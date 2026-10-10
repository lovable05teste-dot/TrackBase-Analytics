import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { auditLogs } from "@/db/schema";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Exclusão de dados — GhostScale", description: "Como excluir os dados da Meta e da sua conta na GhostScale." };

async function status(code: string) {
  if (!/^[A-Z0-9]{8,32}$/.test(code)) return null;
  try {
    await ensureDb();
    const [row] = await getDb().select({ createdAt: auditLogs.createdAt }).from(auditLogs).where(and(eq(auditLogs.action, "meta.data_deletion"), eq(auditLogs.targetId, code))).limit(1);
    return row ? new Date(row.createdAt * 1000).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : null;
  } catch { return null; }
}

export default async function ExclusaoDeDados({ searchParams }: { searchParams: Promise<{ codigo?: string }> }) {
  const code = String((await searchParams).codigo || "").toUpperCase();
  const done = code ? await status(code) : null;
  return (
    <main className="min-h-screen bg-[#080b12] text-slate-100">
      <div className="mx-auto max-w-3xl px-5 py-12">
        <a href="/login" className="inline-flex items-center gap-2.5"><img src="/ghostscale-logo.png" alt="Logo GhostScale" className="h-9 w-auto object-contain" /><b className="text-[15px]">GhostScale</b></a>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-[#ff3b5c]">Privacidade · LGPD</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Exclusão de dados</h1>
        {code && <div className={`mt-6 rounded-xl border p-4 text-sm ${done ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-amber-500/30 bg-amber-500/10 text-amber-200"}`}>{done ? <>Pedido <b>{code}</b> concluído em {done}: as contas de anúncios e os tokens do Facebook foram apagados da GhostScale.</> : <>Não encontramos o pedido <b>{code}</b>. Confira o código ou escreva para o suporte.</>}</div>}
        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-slate-300">
          <section><h2 className="text-lg font-semibold text-white">Dados da Meta (Facebook)</h2><p className="mt-2">Ao conectar o Facebook, a GhostScale guarda, criptografado, o token de acesso e a lista de contas de anúncios autorizadas, usados só para ler campanhas e métricas e, quando você pede, pausar ou ajustar campanhas.</p></section>
          <section><h2 className="text-lg font-semibold text-white">Como excluir</h2><ol className="mt-2 list-decimal space-y-1.5 pl-5"><li>No Facebook, abra <b className="text-white">Configurações → Segurança e login → Apps e sites</b> (ou Integrações comerciais), escolha <b className="text-white">GhostScale</b> e clique em <b className="text-white">Remover</b>. Os tokens e contas são apagados da GhostScale automaticamente, e você recebe um código para acompanhar aqui.</li><li>Ou, dentro da GhostScale, em <b className="text-white">Contas Meta → Desconectar login</b>: apaga as contas e revoga a autorização na Meta.</li><li>Para excluir também a sua conta da GhostScale e todos os dados de rastreamento, escreva para o suporte pelo e-mail informado na Política de Privacidade. Atendemos em até 15 dias (LGPD).</li></ol></section>
          <p className="text-sm text-slate-500">Veja também a <a href="/privacidade" className="underline">Política de Privacidade</a> e os <a href="/termos" className="underline">Termos de Uso</a>.</p>
        </div>
      </div>
    </main>
  );
}
