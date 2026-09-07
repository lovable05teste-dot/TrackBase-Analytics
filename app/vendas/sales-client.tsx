"use client";
import {useEffect,useState} from "react";
type Sale={id:string;externalId:string;provider:string;status:string;value:number;currency:string;updatedAt:number;projectName:string};
export function SalesClient(){
 const [rows,setRows]=useState<Sale[]>([]),[error,setError]=useState("");
 useEffect(()=>{fetch("/api/orders").then(r=>r.json()).then(v=>{if(v.error)throw Error(v.error);setRows(v.orders||[])}).catch(e=>setError(e.message))},[]);
 if(error)return <p className="rounded-xl border border-red-400/30 p-5 text-red-300">{error}</p>;
 return <div className="overflow-x-auto rounded-xl border border-white/10"><table className="w-full text-left text-sm"><thead className="bg-white/5 text-slate-400"><tr><th className="p-3">Pedido</th><th className="p-3">Projeto</th><th className="p-3">Status</th><th className="p-3">Valor</th><th className="p-3">Atualizado</th></tr></thead><tbody>{rows.map(row=><tr key={row.id} className="border-t border-white/10"><td className="p-3">{row.externalId}</td><td className="p-3">{row.projectName}</td><td className="p-3">{row.status}</td><td className="p-3">{new Intl.NumberFormat("pt-BR",{style:"currency",currency:row.currency}).format(Number(row.value))}</td><td className="p-3">{new Date(row.updatedAt*1000).toLocaleString("pt-BR")}</td></tr>)}{!rows.length&&<tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhuma venda recebida.</td></tr>}</tbody></table></div>;
}
