"use client";
import {useEffect} from "react";
export default function ErrorPage({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
 useEffect(()=>{console.error(error)},[error]);
 return <main className="grid min-h-screen place-items-center bg-slate-50 p-5 text-slate-900"><div className="metric-card w-full max-w-md p-8 text-center"><div className="mx-auto grid size-12 place-items-center rounded-full bg-red-50 text-red-600">!</div><h1 className="mt-5 text-xl font-semibold">Não foi possível carregar esta página</h1><p className="mt-2 text-sm leading-6 text-slate-500">A sessão pode ter expirado ou o serviço está temporariamente indisponível.</p><div className="mt-6 flex justify-center gap-2"><button onClick={()=>reset()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Tentar novamente</button><a href="/login" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Voltar ao login</a></div></div></main>;
}
