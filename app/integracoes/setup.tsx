"use client";
import {useState} from "react";
import {ArrowLeft,Check,Copy,FileText,Megaphone} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Card,CardContent,CardHeader,CardTitle} from "@/components/ui/card";
import {Tabs,TabsContent,TabsList,TabsTrigger} from "@/components/ui/tabs";
import {MetaAccountsClient} from "../contas-meta/accounts-client";

const metaUtm="utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}|{{campaign.id}}&utm_content={{ad.name}}|{{ad.id}}&utm_term={{adset.name}}|{{adset.id}}&placement={{placement}}&site_source_name={{site_source_name}}";

export default function IntegrationSetup(){const[copied,setCopied]=useState(false);async function copyUtm(){await navigator.clipboard.writeText(metaUtm);setCopied(true);setTimeout(()=>setCopied(false),1800)}return <main className="min-h-screen bg-[#080b12] px-5 py-8 text-slate-100 lg:px-10"><div className="mx-auto max-w-6xl">
<a href="/" className="mb-7 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft className="size-4"/>Voltar ao dashboard</a>
<div className="mb-7 flex items-center gap-3"><img src="/trackbase-logo.png" alt="Logo TrackBase Analytics" className="h-12 w-24 shrink-0 object-contain"/><div><h1 className="text-2xl font-semibold">Integrações</h1><p className="text-slate-500">Contas de anúncios e parâmetros de rastreamento</p></div></div>
<Tabs defaultValue="ads" className="w-full"><TabsList className="mb-5 grid h-14 w-full grid-cols-2 rounded-xl border border-white/10 bg-[#101522] p-1"><TabsTrigger value="ads" className="h-full gap-2 text-base"><Megaphone className="size-4"/>Anúncios</TabsTrigger><TabsTrigger value="utms" className="h-full gap-2 text-base"><FileText className="size-4"/>UTMs</TabsTrigger></TabsList>
<TabsContent value="ads"><Card className="metric-card"><CardHeader><CardTitle>Contas do Gerenciador de Anúncios</CardTitle></CardHeader><CardContent><p className="mb-5 text-sm leading-6 text-slate-400">Entre com a Meta, escolha a conta que será vinculada e use “Conectar outra conta Meta” para adicionar outros logins.</p><MetaAccountsClient/></CardContent></Card></TabsContent>
<TabsContent value="utms"><Card className="metric-card"><CardHeader><CardTitle>Parâmetros de URL para Meta Ads</CardTitle></CardHeader><CardContent className="space-y-5"><p className="text-sm leading-6 text-slate-400">Copie e cole no campo <b className="text-slate-200">Parâmetros de URL</b> do anúncio. A Meta preencherá campanha, conjunto, anúncio e posicionamento automaticamente.</p><div className="rounded-xl border border-violet-500/20 bg-black/25 p-4"><code className="block break-all text-sm leading-7 text-sky-300">{metaUtm}</code></div><Button onClick={copyUtm} className="min-w-44">{copied?<><Check/>Copiado</>:<><Copy/>Copiar UTMs</>}</Button><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[["utm_campaign","Campanha + ID"],["utm_term","Conjunto + ID"],["utm_content","Anúncio + ID"],["placement","Posicionamento"],["site_source_name","Facebook ou Instagram"],["utm_medium","Tráfego pago"]].map(([key,value])=><div key={key} className="rounded-lg border border-white/8 bg-white/[.025] p-3"><code className="text-xs text-violet-300">{key}</code><p className="mt-1 text-sm text-slate-300">{value}</p></div>)}</div></CardContent></Card></TabsContent>
</Tabs></div></main>}
