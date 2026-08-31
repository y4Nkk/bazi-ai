---
name: Bazi AI design system
version: v1-draft
source: SpiralCoder visual system, adapted for BaZi trend analysis
reference: docs/reference/getdesign-apple.md is archived inspiration only
---

# Design intent

Bazi AI should feel like a calm, precise personal instrument: a pearl-white calculation surface, restrained liquid-glass layers, and a single living time-series canvas. The interface is not a mystical storefront and not a trading terminal. It presents traditional cultural analysis with the same deliberate clarity that SpiralCoder uses for complex creative work.

The page's central visual subject is the 命轨: a year, month, or day trend series with inspectable deterministic factors. Surrounding controls should recede into a coherent soft-glass system. Use one deliberate atmospheric element only: a quiet fluid-light field that grows from the page edges and never competes with chart labels or input forms.

This document recreates SpiralCoder's active web language rather than the archived Apple template. It preserves its semantic token system, Chinese-first typography rhythm, pearl surfaces, restrained borders, rounded control ladder, and blue-lavender-pink AI accent. It does not copy SpiralCoder code, assets, copy, or product-specific components.

## Visual principles

1. One continuous material. Light pages use pearl white and translucent glass as one material family. Dark panels use the related Dracula-like ink palette; they are not unrelated black widgets.
2. The chart is the hero. Inputs, interpretation panels, and controls support the selected period rather than competing with it.
3. Same hue, two brightness levels. An idle interactive surface is the active surface at lower intensity. Do not introduce unrelated hover colors.
4. Information, not decoration. No ornamental badges, random tags, fake labels, ornamental borders, or decoration without a user-facing purpose.
5. Color encodes meaning. Blue is action and selected state; lavender/pink is reserved for AI surfaces; green, yellow, and red are semantic status colors only.
6. Fine boundaries over floating cards. Default UI hierarchy uses surface change and a thin border. Shadows do not create ordinary card hierarchy.

## Token ownership

Create src/styles/tokens.css before creating components. It owns every --bazi-* custom property, font declaration, motion value, blur value, radius, and shadow. Tailwind and component CSS only consume these tokens.

### Light semantic tokens

| Token | Value | Purpose |
| --- | --- | --- |
| --bazi-background | 0 0% 98% | Main pearl canvas, equivalent to #fafafa |
| --bazi-surface | 240 16% 96% | Primary raised surface, equivalent to #f4f4f7 |
| --bazi-surface-elevated | 240 27% 98% / 0.92 | Dialogs and clear glass surfaces |
| --bazi-surface-muted | 240 12% 93% | Recessed chart and secondary regions |
| --bazi-surface-glass | 240 16% 96% / 0.72 | Floating glass |
| --bazi-surface-tinted | 220.596 100% 53.922% / 0.10 | Quiet selected wash |
| --bazi-surface-warm | 316 73% 69% / 0.12 | AI-supporting warm wash only |
| --bazi-ink | 240 8% 20% | Main text, equivalent to #2f2f37 |
| --bazi-ink-secondary | 240 8% 32% | Secondary reading text |
| --bazi-ink-muted | 240 7% 45% | Metadata and helper copy |
| --bazi-primary | 220.596 100% 53.922% | Main action blue, equivalent to #1460ff |
| --bazi-secondary | 316 73% 69% | AI pink, equivalent to #ea76cb |
| --bazi-tertiary | 231 97% 72% | AI lavender, equivalent to #7287fd |
| --bazi-link | 218 80% 46% | Inline link blue, equivalent to #175cd3 |
| --bazi-border | 240 12% 91% | Standard hairline, equivalent to #e4e4ea |
| --bazi-border-strong | 240 9% 83% | Selected and input boundary |
| --bazi-success | 109 58% 40% | Positive status |
| --bazi-warning | 35 77% 49% | Attention status |
| --bazi-danger | 347 87% 44% | Error status |

### Dark semantic tokens

Dark mode recreates the related SpiralCoder dark family: background #282a36, raised surface #44475a, foreground #f8f8f2, muted copy #6272a4, primary #70a7ff, AI pink #ff79c6, and positive green #50fa7b. Do not use large pure-black backgrounds except for a true chart-media void.

### Geometry and motion

| Token | Value |
| --- | --- |
| --bazi-radius-sm | 12px |
| --bazi-radius-md | 16px |
| --bazi-radius-lg | 20px |
| --bazi-radius-xl | 24px |
| --bazi-radius-2xl | 28px |
| --bazi-radius-3xl | 32px |
| --bazi-radius-pill | 999px |
| --bazi-space-1 through --bazi-space-12 | 4, 8, 12, 16, 24, 32, 40, 48px |
| --bazi-motion-fast | 180ms |
| --bazi-motion-base | 260ms |
| --bazi-motion-slow | 400ms |
| --bazi-ease-standard | cubic-bezier(0.22, 1, 0.36, 1) |
| --bazi-blur-sm / md / lg / xl | 12 / 20 / 24 / 40px |

Motion uses opacity and transform only. Every ambient effect has a static reduced-motion frame.

## Typography

Use a Chinese-capable sans-serif system stack. MiSans may be used only when this repository legitimately includes or serves it; otherwise use system-ui, -apple-system, BlinkMacSystemFont, PingFang SC, Microsoft YaHei, sans-serif. For code and numeric factor tables use a compatible monospace stack.

Reproduce SpiralCoder's semantic scale rather than raw one-off font sizes:

| Name | Size | Line height | Use |
| --- | --- | --- | --- |
| micro | 10px | 1.35 | Dense timestamps and technical hints |
| mini | 11px | 1.35 | Tiny status metadata |
| caption | 12px | 1.45 | Labels and supporting text |
| meta | 13px | 1.45 | Secondary metadata |
| body-sm | 14px | 1.55 | Compact controls and tables |
| body | 16px | 1.65 | Default reading text |
| body-lg | 18px | 1.60 | Prominent prose |
| title-sm / md / lg | 20 / 24 / 30px | 1.30 / 1.22 / 1.18 | Card, section, and page titles |
| display-sm / md / lg | 34 / 40 / 56px | 1.14 / 1.08 / 1.02 | High-emphasis product moments |
| metric-sm / md / lg | 24 / 32 / 48px | 1 | Scores and chart values |

Headings are 600 weight with tight tracking. Body is 400 weight. Use 500 only for compact labels when it improves scanability. Do not use text-sm, text-[14px], or other raw Tailwind sizing in production components; expose semantic classes or constants instead.

## Layout

Desktop uses a calm three-zone workbench:

    Header
    Input summary and current period controls
    Main chart canvas                 Selected-period explanation
    Supporting deterministic factors  AI interpretation

The chart owns visual width. At 1068px and above, the explanation column is 320 to 400px and the chart receives the remaining width. At 833px and below, the explanation moves below the chart; no horizontal scroll is required for core reading.

Use a 1440px content ceiling for broad dashboards, 980px for text-heavy reports, 24px desktop gutters, and 16px phone gutters. Structural spacing follows 4, 8, 12, 16, 24, 32, 40, and 48px.

## Components

### App shell

The header is a quiet pearl or translucent-glass bar with a 1px lower border. It contains the product mark, one current-page label, and a single primary action. Do not build a heavy marketing navigation or a faux trading exchange toolbar.

### Birth form

Treat the form as a calculation instrument:

- One clear section heading and short factual helper copy.
- Fields are grouped by time, birthplace, and calculation standard.
- Inputs use 12px radius, a fine border, 44px minimum control height, and explicit validation text.
- The time-standard choice is a real segmented control with civil time and true solar time; the active choice uses the primary tinted surface and strong border.
- Show the correction result inline after the user supplies a place. Never hide a time-boundary warning in a tooltip.

### Trend chart

The chart is a large, low-chrome canvas. Its active line or candle uses primary blue; positive and negative candle direction may use semantic green and danger red only when the legend explains them. Volume-like visualizations must be labelled as change intensity, never trading volume.

Hover and keyboard selection expose a factual inspector: timestamp, resolution, Open, High, Low, Close, score, and deterministic reason codes. The chart itself never uses AI-colored gradients. The selected period can receive a blue tinted band and a thin focus outline.

### Analysis panel

The deterministic result panel uses normal pearl surfaces. The AI interpretation is visually distinct through a subtle blue-lavender-pink edge accent or internal energy line, never through an unrelated full-card gradient. AI text always labels its source and renders beside, not instead of, the source factors.

### Cards, tables, and dialogs

Use 16 to 24px radius according to hierarchy, white or glass surfaces, a thin semantic border, and no ordinary box shadow. Factor tables favor fixed labels, muted metadata, aligned numeric columns, and generous line height. Dialogs use a soft glass surface, backdrop blur, an explicit close button, and clear primary and secondary actions.

### Buttons and links

- Primary: primary-blue fill, white text, 12px or pill radius according to role.
- Secondary: transparent or surface fill with a fine border.
- Destructive: danger only for a real destructive action.
- Press: scale to 0.95 in 180ms.
- Focus: visible primary outline and no color-only state.

## AI and chart visual rules

The project may use the blue-lavender-pink accent only for AI-specific affordances, streamed-analysis progress, and an AI-generated summary border. It is not a general decorative gradient.

Candlestick data, scores, and traditional-factor labels are deterministic data. Use normal semantic colors and plain text. AI output must not alter their visual state or masquerade as a calculation result.

## Responsive behavior

| Width | Behavior |
| --- | --- |
| 1440px and above | Content width locks; chart workbench uses its full two-column composition |
| 1068 to 1439px | Full desktop layout with reduced gutters |
| 834 to 1067px | Chart remains primary; side panel narrows or moves below |
| 641 to 833px | Header simplifies; form and report become one column |
| 420 to 640px | Controls wrap; chart gets a fixed readable height and touch targets remain 44px |
| 419px and below | Display text steps down; no content is hidden behind icon-only controls |

## Non-negotiable exclusions

- No generic SaaS dashboard gradients, noisy astrology textures, galaxy backdrops, tarot clichés, faux gold luxury treatment, neon cyberpunk, or decorative badge clouds.
- No arbitrary color, radius, spacing, font-size, shadow, or transition literals in components.
- No unlabelled chart colors or visual claims that imply financial advice.
- No hover-only critical information. Keyboard and touch users must reach every action and factor explanation.
