# GhostScale Landing — Sistema de Design Premium (InvictusPay register)

> Landing pública em `components/LandingPage.tsx` (rota `/` via `app/page.tsx` quando sem sessão).
> Registro estético inspirado em gateways premium BR. Nada de logo, nome, imagem ou copy de terceiros foi copiado.

## 1. Cor (6 tokens, fundo quase-preto)

| Nome | Hex | Uso |
|---|---|---|
| `void` | `#07080D` | Fundo base da página. Preto com leve azul, nunca `#000` puro. |
| `onyx` | `#0D1017` | Superfície de cards e painel. Contraste sutil sobre `void`. |
| `mist` | `#EFEDFD` | Acento premium. Quase-branco lavanda. Usado a 30–40% em contornos de botão, a 100% só no trecho de gradient-text do hero e no check da tabela. Peso vem do contraste, não de saturação. |
| `smoke` | `#A7B0C2` | Texto secundário. Razão ~7:1 sobre `void` (AA). |
| `ink` | `#F2F0FF` | Texto primário. Razão >14:1 sobre `void` (AA). |
| `jade` | `#34D399` | Prova de dinheiro (valores, ROAS, dot vivo). Uso pontual, 12–15% de fundo. Sem vermelho/neon genérico. |

Bordas: `rgba(239,237,253,.10)` padrão, `.16` hover, `.35` só no plano recomendado e no resultado do simulador.
Texto muted adicional `#6B7280` só para microcopy <12px sobre `onyx` (mantido ≥4.5:1 por tamanho/peso onde for leitura).

## 2. Tipografia (nada de Inter/system padrão)

- Display/headline: `Instrument Serif` 400 + itálico para o trecho de impacto. Serifada premium, leitura de alto ticket. Fallback `Georgia, serif`.
- Corpo/UI/números: `Manrope` 400/500/600/700/800. Grotesca limpa de fintech, tabular-nums para valores. Fallback `system-ui`.
- Mono/code: `JetBrains Mono` 400 só nos snippets de `Como funciona`.
- Escala: hero 40px mobile / 64px desktop (tracking -0.03em, leading 1.05); H2 30/36px; H3/card title 17–18px; corpo 15–16px/1.7; micro 12–13px. Gradient-text só no hero, 1 trecho.

Carregamento: 2 famílias via Google Fonts `display=swap` em `app/layout.tsx`. Sem FOUT bloqueante.

## 3. Layout (max-w-6xl, editorial, não SaaS genérico)

- Grid base `max-w-6xl px-4 sm:px-5`, hero centrado, densidade arejada (py-16/24).
- Hero: eyebrow em frase normal + H1 + sub + CTA duplo lado a lado + micro-garantias + painel vidro + 2 tickers. Glow mais forte só aqui, full-bleed atrás.
- Dores (6 cards, 3 col): ícone em caixa `mist/8`, título curto, 2 linhas. CTA intermediário é link textual, sem seta.
- Solução (9 cards, 3 col sobre faixa `onyx/60` com borda top/bottom): mesmo ritmo, hover só borda.
- Comparativo (max-w-4xl, tabela 3 col): coluna GhostScale com check `mist`, concorrente apagada `smoke/60`.
- Simulador (max-w-4xl, grid 2 col desktop / 1 col mobile): esquerda inputs, direita resultado em painel com borda `mist/25` e fundo em degradê sutil. É a calculadora premium, tratamento mais rico permitido.
- Como funciona (3 passos numerados `01/02/03` em serif grande, code block real).
- Preços (4 cards + slider real): recomendado com borda `mist/40` + glow e selo, demais `white/8` discretos.
- FAQ (max-w-3xl, accordion 1 aberto): motion só aqui, responde ao clique.
- CTA final (painel `onyx` com glow interno, não degradê vermelho): H2 + CTA duplo.
- Footer: 4 col desktop / 1-2 col mobile, links reais, sem setas.

## 4. Princípios (o que impede virar template)

1. Contraste sutil vence saturação. Nenhum neon genérico sobre preto.
2. Artwork estática vence canvas. Profundidade via 2 radiais CSS full-bleed + grão SVG 3% + grid 4%, zero WebGL.
3. Motion responde, não decora. Um `fadeIn` no hero. Resto estático, exceto marquee GPU e accordion a clique.
4. Hierarquia por contenção. Acento `mist` em 1 lugar por seção (ícone OU borda OU check).
5. Tudo real. Simulador, slider de preço, tickers, âncoras e CTAs funcionam. Nenhum href morto.

## 5. Efeitos, performance e acesso

- Hero artwork: `radial-gradient(900px 420px at 50% -40px, rgba(239,237,253,.09), transparent 60%)` + violeta `rgba(117,92,255,.08)` lateral. Estático, sem animação.
- Textura: data-uri noise `opacity .035` + `linear-gradient` grid 64px a 4%. Mobile reduzido pela metade via media query.
- Sem partículas. Marquees só `transform: translate3d`, 32s/44s, `pause` no hover, `off` com `prefers-reduced-motion` e com aba oculta (CSS não corre sem paint; sem rAF).
- Contraste validado AA com glows ligados. `prefers-reduced-motion: reduce` desliga marquee/bar/fade.
- Lighthouse: sem blur pesado, sem backdrop-blur no hero, sem cursor custom, sem typewriter. `content-visibility: auto` abaixo da dobra.
- Breakpoints testados: 360 / 414 / 768 / 1280+. Inputs com `min-w-0`, tabela com scroll-x, CTAs wrap.
