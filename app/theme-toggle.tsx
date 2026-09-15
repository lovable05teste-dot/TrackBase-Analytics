"use client";
import {Moon,Sun} from "lucide-react";
import {useEffect,useState} from "react";
export function ThemeToggle(){
 const [dark,setDark]=useState(true);
 useEffect(()=>{const saved=localStorage.getItem("tb_theme")||"dark";const isDark=saved==="dark";setDark(isDark);document.documentElement.classList.toggle("dark",isDark);document.documentElement.style.colorScheme=saved},[]);
 const toggle=()=>{const next=!dark;const value=next?"dark":"light";setDark(next);localStorage.setItem("tb_theme",value);document.documentElement.classList.toggle("dark",next);document.documentElement.style.colorScheme=value};
 return <button type="button" onClick={toggle} className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" aria-label={dark?"Ativar tema claro":"Ativar tema escuro"}>{dark?<Sun className="size-4"/>:<Moon className="size-4"/>}</button>;
}
