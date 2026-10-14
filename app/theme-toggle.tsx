"use client";
import {Moon,Sun} from "lucide-react";
import {useSyncExternalStore} from "react";

// O tema real é a classe "dark" do <html>, definida pelo script do layout antes
// da pintura. O botão só lê essa classe e a troca: sem estado duplicado.
function subscribeTheme(notify: () => void) {
 const observer = new MutationObserver(notify);
 observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
 return () => observer.disconnect();
}
const isDarkNow = () => document.documentElement.classList.contains("dark");

export function ThemeToggle(){
 const dark = useSyncExternalStore(subscribeTheme, isDarkNow, () => true);
 const toggle=()=>{const next=!dark;const value=next?"dark":"light";try{localStorage.setItem("tb_theme",value)}catch{}document.documentElement.classList.toggle("dark",next);document.documentElement.style.colorScheme=value};
 return <button type="button" onClick={toggle} className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" aria-label={dark?"Ativar tema claro":"Ativar tema escuro"}>{dark?<Sun className="size-4"/>:<Moon className="size-4"/>}</button>;
}
