# Design Resumido - Planeta Agua

Versao compacta do design system para auto-carregamento. Para detalhes completos, ler `intercom/DESIGN.md`.

## Principios

- Canvas cream-white `#f5f1ec`, nunca branco puro como fundo.
- Cards brancos `#ffffff` flutuando sobre o cream para hierarquia.
- Sem drop shadows; profundidade via surface change.
- Charcoal `#111111` e a cor primaria (botoes, texto).
- Fin Orange `#ff5600` apenas para CTA de destaque, nunca decorativo.
- Fonte: Saans (substituto gratuito: Inter weight 500). Display weight 500, body weight 400.
- Tracking negativo em display (-2px no 72px, escala proporcional).

## Cores Essenciais

| Token | Hex | Uso |
|---|---|---|
| canvas | `#f5f1ec` | Fundo da pagina |
| surface-1 | `#ffffff` | Cards, botoes secundarios |
| surface-2 | `#ebe7e1` | Banners, alt-rows |
| ink | `#111111` | Texto, botao primario |
| ink-muted | `#626260` | Texto secundario |
| ink-subtle | `#7b7b78` | Texto terciario |
| hairline | `#d3cec6` | Bordas 1px |
| fin-orange | `#ff5600` | CTA de destaque apenas |
| semantic-error | `#c41c1c` | Erro |
| semantic-success | `#0bdf50` | Sucesso |

## Tipografia

| Token | Tamanho | Weight | Line-height | Tracking |
|---|---|---|---|---|
| display-xl | 72px | 500 | 1.05 | -2.0px |
| display-lg | 56px | 500 | 1.10 | -1.4px |
| display-md | 40px | 500 | 1.15 | -0.8px |
| headline | 28px | 500 | 1.20 | -0.5px |
| card-title | 22px | 500 | 1.25 | -0.3px |
| body-lg | 18px | 400 | 1.50 | -0.1px |
| body | 16px | 400 | 1.50 | 0 |
| body-sm | 14px | 400 | 1.50 | 0 |
| caption | 12px | 400 | 1.40 | 0 |
| button | 15px | 500 | 1.20 | 0 |

## Raios

| Token | Valor | Uso |
|---|---|---|
| xs | 4px | Chips, badges |
| md | 8px | Botoes, inputs |
| lg | 12px | Cards |
| xl | 16px | Mockups, modais |

## Espacamento

| Token | Valor |
|---|---|
| xs | 8px |
| sm | 12px |
| md | 16px |
| lg | 24px |
| xl | 32px |
| xxl | 48px |

## Componentes Chave

- **button-primary**: bg ink, texto branco, radius 8px, padding 10px 18px.
- **button-secondary**: bg branco, texto ink, border 1px hairline, radius 8px.
- **button-fin**: bg fin-orange, texto branco, radius 8px. Reservado para CTA de destaque.
- **Card**: bg branco, radius 12px, padding 24px, sem shadow. Opcional border 1px hairline.
- **text-input**: bg branco, texto ink, radius 8px, padding 10px 14px, border 1px hairline.

## Nao Fazer

- Nao usar branco puro como canvas.
- Nao usar fin-orange como fundo de secao ou CTA generico.
- Nao adicionar drop shadow em cards.
- Nao pill-round CTAs (usar radius 8px).
- Nao usar all-caps com tracking em eyebrows.
