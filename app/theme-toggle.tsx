"use client";
import {Moon,Sun} from "lucide-react";
import {useEffect,useState} from "react";
export function ThemeToggle(){
 const [dark,setDark]=useState(false);
 useEffect(()=>{const saved=localStorage.getItem("tb_theme");const isDark=saved==="dark";setDark(isDark);document.documentElement.classList.toggle("dark",isDark)},[]);
 const toggle=()=>{const next=!dark;setDark(next);localStorage.setItem("tb_theme",next?"dark":"light");document.documentElement.classList.toggle("dark",next)};
 return <button type="button" onClick={toggle} className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" aria-label={dark?"Ativar tema claro":"Ativar tema escuro"}>{dark?<Sun className="size-4"/>:<Moon className="size-4"/>}</button>;
}
