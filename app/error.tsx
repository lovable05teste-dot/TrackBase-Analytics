"use client";
import {useEffect} from "react";
export default function ErrorPage({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
 useEffect(()=>{console.error(error)},[error]);
 return <main className="grid min-h-screen place-items-center bg-[#080b12] p-5 text-slate-100"><div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101521] p-8 text-center"><div className="mx-auto grid size-12 place-items-center rounded-full bg-red-500/10 text-red-400">!</div><h1 className="mt-5 text-xl font-semibold">Esta área não respondeu</h1><p className="mt-2 text-sm leading-6 text-slate-400">Sua conta continua segura. Tente carregar novamente; se necessário, volte ao painel.</p><div className="mt-6 flex justify-center gap-2"><button onClick={()=>reset()} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500">Tentar novamente</button><a href="/" className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/5">Voltar ao painel</a></div></div></main>;
}
