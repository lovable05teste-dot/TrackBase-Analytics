export type ProtectionConfig = {
  enabled: boolean;
  mode: "monitor" | "block";
  allowedDomains: string[];
  includeSubdomains: boolean;
  framePolicy: "allow" | "same-origin" | "deny";
  preventImageDrag: boolean;
  message: string;
};

export function normalizeDomain(input: string): string {
  const value = input.trim();
  if (!value || value.length > 2048 || /[\s@*\\]/.test(value)) throw new Error("Informe um domínio válido, sem espaços ou curingas.");
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Use um domínio HTTP ou HTTPS.");
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host.includes(".") || !host.split(".").every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) throw new Error("Informe um domínio completo, como suaoferta.com.br.");
  return host;
}

export function defaultProtection(domain?: string | null): ProtectionConfig {
  let allowedDomains: string[] = [];
  try { if (domain) allowedDomains = [normalizeDomain(domain)]; } catch { /* O usuário pode corrigir o domínio antes de ativar. */ }
  return { enabled: false, mode: "monitor", allowedDomains, includeSubdomains: false, framePolicy: "same-origin", preventImageDrag: false, message: "Esta página não está autorizada neste endereço." };
}

export function validateProtection(raw: unknown): ProtectionConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Configuração inválida.");
  const v = raw as Record<string, unknown>;
  if (typeof v.enabled !== "boolean" || typeof v.includeSubdomains !== "boolean" || typeof v.preventImageDrag !== "boolean") throw new Error("Opções de proteção inválidas.");
  if (v.mode !== "monitor" && v.mode !== "block") throw new Error("Escolha o modo observar ou bloquear.");
  if (v.framePolicy !== "allow" && v.framePolicy !== "same-origin" && v.framePolicy !== "deny") throw new Error("Regra de iframe inválida.");
  if (!Array.isArray(v.allowedDomains) || v.allowedDomains.length > 30 || v.allowedDomains.some(d => typeof d !== "string")) throw new Error("Informe até 30 domínios.");
  const allowedDomains = [...new Set(v.allowedDomains.map(d => normalizeDomain(d)))];
  if (v.enabled && !allowedDomains.length) throw new Error("Adicione o domínio da sua página antes de ativar a proteção.");
  if (typeof v.message !== "string" || !v.message.trim() || v.message.length > 240) throw new Error("A mensagem deve ter de 1 a 240 caracteres.");
  return { enabled: v.enabled, mode: v.mode, allowedDomains, includeSubdomains: v.includeSubdomains, framePolicy: v.framePolicy, preventImageDrag: v.preventImageDrag, message: v.message.trim() };
}

export function parseProtection(raw: string | null | undefined, domain?: string | null): ProtectionConfig {
  try { return validateProtection(JSON.parse(raw || "null")); } catch { return defaultProtection(domain); }
}

export function domainAllowed(host: string, config: ProtectionConfig): boolean {
  const normalized = host.toLowerCase().replace(/\.$/, "");
  return config.allowedDomains.some(d => normalized === d || (config.includeSubdomains && normalized.endsWith(`.${d}`)));
}

export function evaluateProtection(config: ProtectionConfig, host: string, embedded = false, sameOrigin = false) {
  const reason = !config.enabled ? "disabled" : !domainAllowed(host, config) ? "domain" : embedded && (config.framePolicy === "deny" || (config.framePolicy === "same-origin" && !sameOrigin)) ? "frame" : "allowed";
  const violation = reason === "domain" || reason === "frame";
  return { reason, violation, blocked: violation && config.mode === "block" };
}

// Configuração pública: somente regras de domínio/iframe. IPs nunca entram no script.
export function protectionScript(config: ProtectionConfig, projectKey: string, endpoint: string): string {
  return `(function(){
    var C=${JSON.stringify(config)},K=${JSON.stringify(projectKey)},E=${JSON.stringify(endpoint)};
    window.__gsProtections=window.__gsProtections||{};if(window.__gsProtections[K])return;window.__gsProtections[K]=true;
    if(!C.enabled)return;
    var host=location.hostname.toLowerCase().replace(/\\.$/,""),embedded=window.top!==window.self,same=false;
    try{same=window.top.location.origin===location.origin}catch(e){}
    var domain=C.allowedDomains.some(function(d){return host===d||(C.includeSubdomains&&host.endsWith("."+d))});
    var reason=!domain?"domain":embedded&&(C.framePolicy==="deny"||(C.framePolicy==="same-origin"&&!same))?"frame":"allowed";
    var blocked=reason!=="allowed"&&C.mode==="block";
    window.__gsProtectionResult={reason:reason,blocked:blocked,mode:C.mode};
    var data=JSON.stringify({projectKey:K,eventName:reason==="allowed"?"SecurityCheck":"SecurityViolation",url:location.origin,reason:reason,mode:C.mode});
    try{if(!navigator.sendBeacon||!navigator.sendBeacon(E,new Blob([data],{type:"text/plain"})))fetch(E,{method:"POST",headers:{"content-type":"text/plain"},body:data,keepalive:true,credentials:"omit"}).catch(function(){})}catch(e){}
    if(blocked){
      document.documentElement.style.visibility="hidden";
      function block(){var box=document.createElement("main"),heading=document.createElement("h1"),text=document.createElement("p");
        box.setAttribute("role","alert");box.style.cssText="min-height:100vh;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:32px;background:#101013;color:#f8fafc;font:16px/1.6 system-ui;text-align:center";
        heading.textContent="Página protegida";text.textContent=C.message;box.appendChild(heading);box.appendChild(text);document.body.replaceChildren(box);document.documentElement.style.visibility="visible";}
      if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",block,{once:true});else block();
    }else if(C.preventImageDrag){document.addEventListener("dragstart",function(e){if(e.target&&e.target.tagName==="IMG")e.preventDefault()})}
  })();`;
}
