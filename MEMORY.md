# Project memory

This file records verified, reusable project decisions. It is not a user-profile store, an AI conversation log, or a place for API keys, birth data, tokens, prompts, or generated personal reports.

## 2026-08-31: initial boundary

- Repository: y4Nkk/bazi-ai, private GitHub repository.
- Product: Chinese web application for deterministic BaZi trend analysis with optional BYOK AI interpretation.
- Deployment: one Next.js application on Vercel; no database, account system, queue, cron job, or separate backend in V1.
- Input owner: BirthInput includes Gregorian date and time, traditional chart gender, birthplace, timezone, longitude, latitude, and an explicit civil or true-solar time standard. Four manually typed pillars are not a V1 input path.
- Calculation owner: deterministic domain modules own the chart, luck cycles, factors, scores, and candles. AI cannot calculate or overwrite them.
- Chart owner: the smallest series point is a shichen; daily, monthly, and yearly candles aggregate lower-level points.
- BYOK: provider presets only; API keys are transient request data and are never persisted or logged.
- Visual source: DESIGN.md recreates SpiralCoder's semantic liquid-glass system under Bazi AI tokens. docs/reference/getdesign-apple.md is a preserved third-party Apple inspiration file, not the project visual source of truth.

## 2026-08-31: UI contract migration

- The single Bazi AI UI standard is DESIGN.md plus its three runtime owners: src/styles/tokens.css, tailwind.config.cjs, and src/lib/typography.ts.
- `src/styles/tokens.css` is the only visual-token owner and uses the `--bazi-*` namespace. Tailwind maps those tokens; typography exports `TEXT`, `TEXT_SHOWCASE`, and `TEXT_RICH`.
- The portable design system retains SpiralCoder's shared semantic palette, glass material, dark mode, shadows, radius ladder, blur, motion, z-index scale, responsive typography, and text compositions. SpiralCoder-only pet, lesson, and recommendation tokens were intentionally not carried over.

## Verification status

- Git repository initialized locally on main and linked to https://github.com/y4Nkk/bazi-ai.git.
- GitHub repository is private and has the configured description.
- The getdesign Apple reference was installed and preserved at docs/reference/getdesign-apple.md.
- The UI standard was statically verified: Tailwind config loads in Node, every mapped Bazi token is defined, and no obsolete `--sw-*` or `text-sw-*` identifier remains.

## 2026-08-31: V1 application implemented

- Stack: one Next.js 14 App Router app (TypeScript strict, Node.js route handlers, Tailwind mapped to `--bazi-*` tokens, vitest). Dependencies: `lunar-typescript` for calendar facts, `zod` for request/response contracts.
- Ownership as implemented: `src/domain/bazi` owns BirthInput (`normalize.ts`), timezone/true-solar conversion (`truesolar.ts`, NOAA equation of time), calendar facts and the fast transit-pillar machinery (`calendar.ts`), the natal chart (`chart.ts`), and luck cycles (`luck.ts`). `src/domain/fortune` owns `SCORING_PROFILE_VERSION = "scoring-v1"` and the documented rubric (`profile.ts`), the reason-code catalog (`factors.ts`), shichen-point timeline generation and day/month/year candle aggregation (`series.ts`), and ChartSnapshot assembly with `snapshotKey` (`snapshot.ts`). `ENGINE_VERSION = "1.0.0"` lives in `src/domain/version.ts`.
- Engine conventions (verified against `lunar-typescript` directly): the year pillar switches exactly at Li Chun; the month pillar follows exact 节 datetimes via a segment table; the day pillar uses date arithmetic anchored to 2000-01-01; 晚子时 (23:xx) derives its hour stem from the next day's stem while keeping the current day pillar (library sect 2 default). Under `timeStandard: trueSolar` every evaluation clock is shifted by that day's longitude + equation-of-time correction.
- Series contract: twelve shichen points per civil day (start hours 23, 1, 3, …, 21); daily candles aggregate the twelve points (open = first, close = last, high/low = extremes); monthly aggregate daily candles; yearly aggregate monthly; OHLC invariants hold by construction. Range limits: day ≤ 62 days, month ≤ 24 months, year ≤ 12 years.
- API: `POST /api/chart` (BirthInput + range + dimension + resolution → ChartSnapshot, never calls an LLM) and `POST /api/analyze` (compact selection + provider preset + model id + one-transient key → schema-validated AnalysisOutput). Analyze rejects unknown keys (including injected `baseUrl`), rejects non-acknowledged boundary changes, and provider error bodies are never forwarded because they can echo masked key fragments (verified against a live OpenAI 401).
- UI: pearl workbench with translucent header, birth form with real segmented controls and the boundary acknowledgement gate, interactive SVG candlestick chart (keyboard focus + arrow navigation, tinted selected band, success/danger legend), pillar/five-element/lunar-facts panels with both time-standard candidates, luck-cycle strip, and the BYOK AI panel with AI-gradient framing and fixed cultural-entertainment disclaimer. Tailwind screens were re-mapped to the DESIGN.md ladder (420/641/834/1068/1440); `min-h-touch` (44px) was added as a token-mapped utility; ambient keyframes live in `tokens.css`.
- Verification run this session: 45 vitest tests across 7 files (Li Chun and leap-month fixtures, fast-pillar vs library equivalence, true-solar boundary crossing in both directions, luck-direction fixtures, OHLC and cross-resolution agreement, determinism, BirthInput/API validation, AI schema rejection, key-echo regression), `tsc --noEmit`, `next build`, HTTP end-to-end against the production server (valid chart snapshot, invalid date / manual-pillar / oversized-range rejections, analyze validation and provider-error mapping), and a Playwright UI walkthrough (`npm run verify:ui`, scripts/ui-walkthrough.mjs using the system Chrome channel) at 1280×800 desktop and 390×844 mobile: fill form → generate → day/month/year switching (31/24/12 candles), dimension preserved across switches, candle selection updates the detail panel, no horizontal scroll at either width, all interactive controls ≥ 44px, API key input masked. Screenshot-based visual QA of both viewports found no layout breakage.
- Not verified in-session: deployment to Vercel (requires user account authorization; `vercel deploy` needs no extra configuration).

## 2026-08-31: Vercel deployment

- Deployed via Vercel dashboard import of y4Nkk/bazi-ai (main branch, Next.js preset, zero environment variables per the BYOK contract). Production domain: https://bazi-ai-yy1s-projects.vercel.app (the short `bazi-ai.vercel.app` is taken, so Vercel assigned the team-suffixed domain). Automatic deployments on every push to main.
- Deployment Protection (Vercel Authentication) was ON by default after import; the owner chose whether to disable it for public access (Settings → Deployment Protection). Until disabled, visitors are redirected to Vercel SSO.

## 2026-08-31: birthplace place picker

- `src/lib/places.ts` is the single owner of place search; `src/lib/places-data.ts` is the generated dataset (414 entries: 363 Chinese city-level divisions + municipalities/港澳 from the public Aliyun DataV GeoAtlas, plus curated 台北/高雄 and overseas cities). Regenerate with `node scripts/generate-places.mjs`; do not edit the data file by hand.
- The 出生地 field is a combobox (`src/components/place-input.tsx`): typing filters by name/province (suffix-tolerant, e.g. 南宁市), picking an option auto-fills birthplace, longitude, latitude, and timezone. Free-text entry and manual coordinate editing remain valid paths.
- `INITIAL_FORM` longitude/latitude are now empty (previously silently pre-filled with Shanghai 121.47/31.23); the native required check blocks submission until a place is picked or coordinates are typed.
- `TIMEZONE_OPTIONS` (exported from `birth-form.tsx`) must stay a superset of every `PLACES` timezone; `tests/places.test.ts` enforces dataset integrity, fixture coordinates (南宁 108.32/22.82, 乌鲁木齐 87.62/43.79), search ranking, and timezone coverage.
- Verified: `tsc --noEmit`, 55 vitest tests, `next build`, and `npm run verify:ui` (which now asserts the 乌鲁木齐 auto-fill at 1280×800 and 390×844; popover screenshots in the walkthrough output directory).

## 2026-08-31: SpiralCoder form controls ported as global components

- `src/components/controls.tsx` is the single owner of global controls. `Input`, `Textarea`, `Checkbox`, and `Select` are ported from SpiralCoder `web/src/components/ui` (checkbox.tsx, input.tsx, select.tsx, textarea.tsx), re-tokenized to `--bazi-*`. New dependencies: `@radix-ui/react-select`, `lucide-react`. The old `inputClass` export was deleted; raw `<input>/<select>/<textarea>` are banned from screens per DESIGN.md Components section.
- Deliberate deviations from the SpiralCoder source, required by the bazi contract: controls use `rounded-sm` (12px) instead of the source's `rounded-xl`; min-h-touch (44px) instead of the source's 36–40px rows; a visible `focus-visible` primary ring was added (source inputs had none); Select exposes a flat `options` array API instead of the full Radix compound API, and entry animations were dropped (no tailwindcss-animate plugin here).
- New tokens in `src/styles/tokens.css` (only owner): `--bazi-radius-control` (5px checkbox square, mapped as `rounded-control`), `--bazi-shadow-control` (idle glass inset highlight), `--bazi-shadow-control-checked` (checked primary tint). DESIGN.md geometry paragraph was amended for the micro-control radius.
- Consumers unified: birth-form (date/time/number inputs, timezone Select, boundary Checkbox), analysis-panel (provider Select, model/key Inputs, question Textarea), trend-chart (dimension Select), place-input (Input). Radix Select renders a hidden 1×1 native select for form compat — the walkthrough 44px audit now skips `aria-hidden` subtrees, and select interactions use trigger-click + `getByRole("option")` instead of `selectOption`.
- Verified: `tsc --noEmit`, 55 vitest tests, `next build`, `npm run verify:ui` all pass; screenshots checked the select popup (glass + check indicator), the boundary-warning checkbox unchecked/checked states, and desktop/mobile form layout. Operational note: `TaskStop` on `npm run start` orphans the next-server child and keeps port 3000 bound — kill the listener PID (netstat) before restarting, or a stale-build server will answer and break hydration in the walkthrough.
