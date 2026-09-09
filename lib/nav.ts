export type NavItem = { label: string; href: string; badge?: string };
export type NavGroup = { title: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Principal",
    items: [
      { label: "Dashboard", href: "/" },
      { label: "Novo Projeto", href: "/projetos/novo" },
      { label: "Campanhas", href: "/campanhas" },
      { label: "Meta Lab", href: "/meta-lab" },
      { label: "Vendas", href: "/vendas" },
      { label: "Eventos", href: "/eventos" },
    ],
  },
  {
    title: "Análise & Otimização",
    items: [
      { label: "Relatórios", href: "/relatorios" },
      { label: "Relatórios de UTMs", href: "/relatorios/utms" },
      { label: "Análise de Funil", href: "/funil" },
      { label: "Heatmaps", href: "/heatmaps" },
      { label: "Predict (IA)", href: "/predict", badge: "IA" },
      { label: "Atribuição", href: "/atribuicao" },
      { label: "Agent Hub", href: "/agent-hub" },
    ],
  },
  {
    title: "Segurança",
    items: [
      { label: "Anti-Clone", href: "/seguranca/anti-clone" },
      { label: "Blacklist de IP", href: "/seguranca/blacklist" },
      { label: "Tráfego Inválido", href: "/seguranca/trafego-invalido" },
      { label: "Monitoramento de Sites", href: "/seguranca/monitoramento" },
    ],
  },
  {
    title: "Comunidade",
    items: [
      { label: "Rankings", href: "/comunidade/rankings" },
      { label: "Chat e Clubes", href: "/comunidade/chat" },
    ],
  },
  {
    title: "Conta",
    items: [
      { label: "Meu Perfil", href: "/conta/perfil" },
      { label: "Assinatura", href: "/conta/assinatura" },
      { label: "Assinatura Avançado", href: "/conta/assinatura-avancada", badge: "TikTok + Meta" },
    ],
  },
  {
    title: "Integrações de Anúncio",
    items: [
      { label: "Integrações", href: "/integracoes" },
      { label: "Gateways", href: "/integracoes/gateways" },
      { label: "Offer Lab", href: "/offer-lab" },
      { label: "Contas Meta", href: "/contas-meta" },
      { label: "Pixel & CAPI", href: "/pixel-capi" },
    ],
  },
  {
    title: "Ferramentas Avançado",
    items: [
      { label: "UTM Builder", href: "/ferramentas/utm-builder" },
      { label: "Calculadora ROAS/CPA", href: "/ferramentas/calculadora-roas" },
      { label: "CPA Máximo", href: "/ferramentas/cpa-maximo" },
      { label: "Nomes de Campanha", href: "/ferramentas/nomes-campanha" },
      { label: "Mapa de Links", href: "/ferramentas/mapa-links" },
      { label: "Checklist Campanha", href: "/ferramentas/checklist" },
      { label: "Ativador Pixel TikTok", href: "/ferramentas/ativador-tiktok" },
      { label: "Webhooks", href: "/webhooks" },
      { label: "Docs API Vendas", href: "/docs/api-vendas" },
      { label: "Feedback", href: "/feedback" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { label: "Documentação", href: "/docs" },
      { label: "Equipe", href: "/equipe" },
      { label: "Configurações", href: "/configuracoes" },
    ],
  },
];

export const ALL_NAV_HREFS = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href));
