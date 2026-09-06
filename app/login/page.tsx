"use client";
import {FormEvent,useState} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";

export default function Login(){const[password,setPassword]=useState("");const[error,setError]=useState("");const[loading,setLoading]=useState(false);
async function submit(e:FormEvent){e.preventDefault();setLoading(true);setError("");try{const r=await fetch("/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password})});const b=await r.json();if(!r.ok)throw new Error(b.error);location.href="/";}catch(e){setError(e instanceof Error?e.message:"Não foi possível entrar.");}finally{setLoading(false)}}
return <main className="grid min-h-screen place-items-center bg-[#080b12] p-5 text-slate-100"><form onSubmit={submit} className="metric-card w-full max-w-sm space-y-5 rounded-2xl p-7"><div><p className="font-bold text-violet-300">TrackBase Analytics</p><h1 className="mt-4 text-2xl font-semibold">Entrar</h1><p className="mt-2 text-sm text-slate-400">Use a senha administrativa configurada na Vercel.</p></div><Input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Senha" autoFocus required/>{error&&<p className="text-sm text-red-300">{error}</p>}<Button className="w-full" disabled={loading}>{loading?"Entrando...":"Entrar"}</Button></form></main>}
