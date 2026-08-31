---
name: Bazi AI UI standard
version: v1
source: SpiralCoder web visual system, reorganized for Bazi AI
runtime_owners:
  - src/styles/tokens.css
  - tailwind.config.cjs
  - src/lib/typography.ts
---

# Bazi AI UI Standard

This is the sole visual contract for Bazi AI. It adopts SpiralCoder's Chinese-first, pearl-and-liquid-glass language while making reproducible calculation facts and the trend chart the visual center.

The contract has exactly three runtime owners:

| Concern | Owner | Consumer rule |
| --- | --- | --- |
| Colors, material, geometry, motion, layers | `src/styles/tokens.css` | Use `--bazi-*`; never add local color, radius, shadow, duration, or z-index literals. |
| Semantic Tailwind utilities | `tailwind.config.cjs` | Use `bg-bazi-*`, `text-bazi-*`, `text-body`, `rounded-*`, and other named extensions. |
| Reusable text compositions | `src/lib/typography.ts` | Use `TEXT` or `TEXT_RICH`; do not recreate class strings at call sites. |

`docs/reference/getdesign-apple.md` is an archived Apple analysis. It is not a runtime owner and cannot override this standard.

## Product character

Bazi AI is a calm calculation instrument, not a mystical storefront and not a financial terminal. The 命轨 trend chart is the hero. Input controls, factor tables, and AI commentary are supporting layers on a continuous pearl-white material.

The one signature visual is a slow, low-detail liquid-light field that enters from page edges. It may support the page atmosphere but never cross chart labels, form values, or report text. Blue is action and selected state; the blue-violet-pink spectrum is reserved for AI affordances. Green, yellow, and red are semantic states only.

## Non-negotiable visual rules

1. **One material family.** Light surfaces are pearl, glass, and thin boundaries. Dark surfaces use the related ink palette, never large pure-black blocks.
2. **Chart before chrome.** The active chart series receives the strongest contrast. Do not make panels, filters, or AI copy visually louder.
3. **One lamp, two brightness levels.** Idle and active states use the same hue at different intensity; do not introduce unrelated hover colors.
4. **Fine boundaries, flat cards.** Surface changes and a one-pixel border create ordinary hierarchy. Shadows are limited to dialogs, menus, popovers, and chart/media depth.
5. **Information, not ornament.** No decorative badges, zodiac textures, galaxy backdrops, tarot motifs, faux gold luxury, neon cyberpunk, or unexplained chart colors.
6. **Real accessible UI.** Every visible control, status, and decoration is a real DOM element. Keyboard focus is visible, touch targets are at least 44px, and critical information is never hover-only.
7. **Motion has a purpose.** Animate opacity and transform only. Every ambient motion has a reduced-motion static frame.

## Token system

All values are defined in `src/styles/tokens.css`. The authoritative semantic families are:

| Family | Required members | Purpose |
| --- | --- | --- |
| Base material | `background`, `surface`, `surface-elevated`, `surface-muted`, `surface-glass` | Pearl canvas and glass layers |
| Reading ink | `ink`, `ink-secondary`, `ink-muted`, `ink-placeholder` | Text hierarchy |
| Action and AI | `primary`, `secondary`, `tertiary`, `ai-accent`, AI/brand gradients | Action is blue; AI uses violet, lavender, pink |
| Meaning | `success`, `warning`, `danger`, `info`, `link` plus soft variants | Explicit states and links |
| Five-element data | `element-wood/fire/earth/metal/water` anchors and `gradient-wood…water` duotones | 木火土金水 identity on pillar characters, element labels, and distribution bars; never UI state |
| Structure | `border`, `border-soft`, `border-strong`, `input` | Hairlines, selected controls, inputs |
| Geometry | `radius-sm` through `radius-3xl`, `radius-tail`, `radius-pill` | Single rounded ladder |
| Depth | `shadow-sm` through `shadow-xl`, `shadow-glow` | Flat cards through floating layers |
| Motion | `motion-fast`, `motion-base`, `motion-slow`, `ease-standard` | 180/260/400ms rhythm |
| Layering | `z-background` through `z-debug` | Fixed stacking scale |

### Color and material use

- Main canvas: `bg-bazi-background`; standard panel: `bg-bazi-surface`; raised dialog/popover: `bg-bazi-surface-elevated` plus `border-bazi-border`.
- Scrollbars use the global treatment from `tokens.css` everywhere: a slim pill thumb derived from ink-muted over a transparent track (Firefox standard properties plus Chromium pseudo-elements). Screens never style scrollbars locally.
- Primary action, active range, and selected chart band: `bazi-primary` and its tinted surface. Never use the AI gradient for deterministic chart values.
- AI invocation, streaming progress, and AI-result framing can use `--bazi-ai-gradient` or `--bazi-ai-gradient-active`. AI content remains clearly labelled and secondary to its deterministic source factors.
- Candle direction may use success and danger only when a legend explains it. Its metric is always `传统命理趋势指数`; never label it price, return, probability, or trading volume.
- Five-element identity is data, not state: large 干支 characters and 五行分布 bars use the `--bazi-gradient-wood/fire/earth/metal/water` duotones; inline element characters use the matching solid `text-bazi-element-*` ink. These colors never encode UI state and never borrow the action-blue or AI spectrum.
- Dark mode uses the matching dark tokens from `tokens.css`. A true media void is the only valid pure-black surface.

### Geometry, space, and depth

The radius ladder is 12, 16, 20, 24, 28, 32px, plus the 999px pill and a 5px micro-control radius (`rounded-control`) used only inside control components such as the checkbox square. Controls use `rounded-sm` (12px); cards use `rounded-md` or `rounded-lg`; major overlays use `rounded-xl` or above. Structural spacing follows 4, 8, 12, 16, 24, 32, 40, and 48px. Do not use arbitrary Tailwind radius, spacing, color, blur, shadow, or duration values.

Small and medium shadows are intentionally transparent: ordinary cards stay flat. `shadow-bazi-lg`, `shadow-bazi-xl`, and `shadow-bazi-glow` are for floating UI and one focused chart/media visual only.

## Typography

The UI is Chinese-first. The primary face is MiSans when the repository legitimately supplies it, then the Chinese system stack. Code and compact numeric factor data use Maple Mono when supplied, then the monospace fallback. The exact stacks are in `tokens.css`.

Use the semantic scale from Tailwind; raw `text-sm`, `text-[14px]`, and component-local `font-size` values are forbidden.

| Role | Sizes | Use |
| --- | --- | --- |
| `micro`, `mini`, `caption`, `meta` | 10, 11, 12, 13px | Timestamp, compact status, labels, supporting metadata |
| `body-sm`, `body`, `body-lg` | 14, 16, 18px | Controls/tables, default reading, prominent prose |
| `title-sm`, `title-md`, `title-lg` | 20, 24, 30px | Card, section, and page titles |
| `display-sm` through `display-3xl` | 34, 40, 56, 72, 88, 104px | Rare landing/report emphasis, never dense dashboard chrome |
| `metric-sm` through `metric-xl` | 24, 32, 48, 72px | Scores and selected chart values |

Headings use 600 weight and tight tracking; body uses 400. Use 500 only for compact labels. `TEXT_SHOWCASE` reserves bold display styles for the rare landing/report emphasis; it is not dashboard chrome. Numeric report values use tabular figures and the mono stack when alignment matters. `TEXT`, `TEXT_SHOWCASE`, and `TEXT_RICH` are the only reusable text-class owner.

## Layout and responsive behavior

Desktop uses a quiet workbench: a compact header, input and period controls, a dominant chart canvas, and a 320–400px explanation rail. At 834px and below, the explanation moves below the chart. There is no horizontal scroll for core reading.

| Width | Required behavior |
| --- | --- |
| 1440px+ | Dashboard ceiling at 1440px; full two-column chart workbench |
| 1068–1439px | Same composition with reduced gutters |
| 834–1067px | Narrow rail or move it below the chart |
| 641–833px | One-column form and report; simplified header |
| 420–640px | Wrapped controls, fixed readable chart height, 44px targets |
| ≤419px | Step display text down; never hide critical content behind icons |

Use a 980px reading/report ceiling, 24px desktop gutters, and 16px phone gutters. Chart width always wins over decorative whitespace.

## Components

Global form controls — `Input`, `Textarea`, `Checkbox`, `Select`, the popover `DatePicker`, and its popover `TimePicker` companion — are ported from SpiralCoder's `web/src/components/ui` set (the `TimePicker` is a local counterpart matching the `DatePicker` treatment), re-tokenized to `--bazi-*`, and sized to the 44px touch contract. They live in `src/components/controls.tsx` plus `src/components/date-picker.tsx`, `src/components/time-picker.tsx`, and `src/components/popover.tsx`; screens must use them instead of raw `<input>`, `<textarea>`, `<select>`, or native date/time inputs. State transitions are motion-token driven: the checkbox check pops in with the spring ease, the select chevron rotates on open, the select popup enters with `animate-select-in`, and the selected option's check pops in — all opacity/transform only, collapsing to their final frame under reduced motion. The DatePicker opens a zh-CN calendar in the shared raised-glass popover (day and nav buttons at 44px with a visible focus ring, a caption that opens a year panel for quick year jumps, 今天/清除 actions); it emits ISO `YYYY-MM-DD` or null, so empty dates stay catchable by explicit submit validation. The TimePicker keeps the same trigger and popover family for `HH:mm` (44px 时/分 option columns, 此刻/完成/清除 actions) and emits `HH:mm` or null.

### App shell and form

The header is pearl or translucent glass with a thin lower border, product mark, current page label, and one primary action. The birth form is a calculation instrument: group civil time, birthplace, and calculation standard; show factual helper copy; use 44px controls; and present real segmented civil/true-solar selection. After a clean generation the form collapses into a one-line birth summary with an edit toggle so the trend chart owns the first screen; a boundary warning keeps the form open for acknowledgement. If the correction changes day or shichen, show the boundary warning inline and require acknowledgement before AI analysis.

### Trend chart and factor data

The chart is a low-chrome canvas. Hover, focus, and touch selection reveal timestamp, resolution, OHLC, score, and deterministic reason codes. The selected period has a tinted primary band and focus outline. Factor tables use fixed labels, muted metadata, aligned numeric columns, and generous line height. Do not fake chart precision or hide calculation caveats in a tooltip.

### Analysis, dialogs, and feedback

Deterministic factors use standard pearl panels. AI commentary may have a restrained AI energy edge, but it must name its source factors and cannot masquerade as calculation output. Dialogs/popovers use raised glass, blur, explicit close actions, and the appropriate floating shadow. Errors name the next action; empty states invite exactly one action.

### Buttons and links

- Primary: blue fill, white text, `rounded-sm` or pill according to role.
- Secondary: transparent/surface fill and a fine border.
- Destructive: danger only for a real destructive action.
- Press: scale 0.95 over `motion-fast`; focus: a visible primary ring.
- Inline links: `bazi-link`; do not repurpose semantic status colors as navigation.

## Implementation checklist

Before shipping a UI change:

1. Read this document plus all three runtime owners.
2. Use semantic classes/tokens only; add a missing semantic token in `tokens.css` rather than an arbitrary literal.
3. Choose `TEXT`/`TEXT_RICH` for reusable text, then test desktop and mobile widths when an app exists.
4. Respect `prefers-reduced-motion`, focus states, 44px targets, and the z-index scale.
5. Confirm deterministic chart data and AI output remain visually distinguishable.
