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
