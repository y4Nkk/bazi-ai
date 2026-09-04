# Project memory

This file records verified, reusable project decisions. It is not a user-profile store, an AI conversation log, or a place for credentials, private project configuration, machine-specific information, birth data, prompts, or generated personal reports.

## 2026-08-31: initial boundary

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

- The getdesign Apple reference was installed and preserved at docs/reference/getdesign-apple.md.
- The UI standard was statically verified: Tailwind config loads in Node, every mapped Bazi token is defined, and no obsolete `--sw-*` or `text-sw-*` identifier remains.

## 2026-08-31: V1 application implemented

- Stack: one Next.js 14 App Router app (TypeScript strict, Node.js route handlers, Tailwind mapped to `--bazi-*` tokens, vitest). Dependencies: `lunar-typescript` for calendar facts, `zod` for request/response contracts.
- Ownership as implemented: `src/domain/bazi` owns BirthInput (`normalize.ts`), timezone/true-solar conversion (`truesolar.ts`, NOAA equation of time), calendar facts and the fast transit-pillar machinery (`calendar.ts`), the natal chart (`chart.ts`), and luck cycles (`luck.ts`). `src/domain/fortune` owns `SCORING_PROFILE_VERSION = "scoring-v1"` and the documented rubric (`profile.ts`), the reason-code catalog (`factors.ts`), shichen-point timeline generation and day/month/year candle aggregation (`series.ts`), and ChartSnapshot assembly with `snapshotKey` (`snapshot.ts`). `ENGINE_VERSION = "1.0.0"` lives in `src/domain/version.ts`.
- Engine conventions (verified against `lunar-typescript` directly): the year pillar switches exactly at Li Chun; the month pillar follows exact 节 datetimes via a segment table; the day pillar uses date arithmetic anchored to 2000-01-01; 晚子时 (23:xx) derives its hour stem from the next day's stem while keeping the current day pillar (library sect 2 default). Under `timeStandard: trueSolar` every evaluation clock is shifted by that day's longitude + equation-of-time correction.
- Series contract: normally twelve shichen atomic points per civil day (start hours 23, 1, 3, …, 21); an IANA DST overlap retains thirteen real points. Their exact offset-bearing instant is the stable identity, so overlaps remain distinct. Daily candles aggregate all real points (open = first, close = last, high/low = extremes); monthly aggregate daily candles; yearly aggregate monthly; OHLC invariants hold only at aggregate grains. Range limits: shichen ≤ 7 days, day ≤ 62 days, month ≤ 24 months, year ≤ 12 years.
- API: `POST /api/chart` (BirthInput + range + dimension + resolution → ChartSnapshot, never calls an LLM) and `POST /api/analyze` (compact selection + provider preset + model id + one-transient key → schema-validated AnalysisOutput). Analyze rejects unknown keys (including injected `baseUrl`), rejects non-acknowledged boundary changes, and provider error bodies are never forwarded because they can echo masked key fragments (verified against a live OpenAI 401).
- UI: pearl workbench with translucent header, birth form with real segmented controls and the boundary acknowledgement gate, interactive SVG candlestick chart (keyboard focus + arrow navigation, tinted selected band, success/danger legend), pillar/five-element/lunar-facts panels with both time-standard candidates, luck-cycle strip, and the BYOK AI panel with AI-gradient framing and fixed cultural-entertainment disclaimer. Tailwind screens were re-mapped to the DESIGN.md ladder (420/641/834/1068/1440); `min-h-touch` (44px) was added as a token-mapped utility; ambient keyframes live in `tokens.css`.
- Verification run this session: 45 vitest tests across 7 files (Li Chun and leap-month fixtures, fast-pillar vs library equivalence, true-solar boundary crossing in both directions, luck-direction fixtures, OHLC and cross-resolution agreement, determinism, BirthInput/API validation, AI schema rejection, key-echo regression), `tsc --noEmit`, `next build`, endpoint validation, and desktop/mobile UI walkthroughs. The walkthrough covered form submission, resolution switching, selection, keyboard navigation, touch-target size, responsive layout, and masked key input.

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

## 2026-08-31: workbench layout refactor (module-by-module review, plan B)

- Structure: after a clean generation the birth form collapses into a `BirthSummary` one-line bar (乾造/坤造 · datetime · place · timezone · standard + 修改出生信息); the trend chart now owns the first screen (verified at 1440 and 390: chart title in viewport). A boundary warning suppresses the collapse so acknowledgement stays visible. `AppShell` takes a `headerAction` node instead of hardcoding the submit button.
- Form regrouped into time (date/time/timezone + standard segmented), gender, and place (place/lon/lat) rows; spec-speak copy ("四柱手动输入不在本产品范围内") replaced with reproducibility copy; the correction note renders only after generation.
- Pillar panel: mobile 2×2 grid, hidden-stems as a stacked label+nowrap value; 时间基准对照 replaced the cramped 4-column table with two wrap-friendly comparison rows (selected row highlighted + 当前基准 tag); snapshotKey moved into a `<details>` under a 复现信息 overline; rail sections use TEXT.overline subheads with border-t dividers.
- Trend chart: window buttons use the global `Button`; KPI strip restructured (label line includes 收盘指数, number on its own line, OHLC right). AI panel is gated by the workbench (renders only with a snapshot); its `hasSnapshot` prop and empty-state branch were deleted.
- Real bug found and fixed during verification: the header action swaps 修改出生信息 (type=button) ↔ 生成命盘 (type=submit form=birth-form) at the same DOM node; React's sync re-render inside click dispatch mutated type before the browser ran activation behavior, so a click on the edit button could submit the form and re-collapse it. Fix: distinct `key`s force node replacement. The walkthrough now asserts collapse/summary/reopen.
- Verified: typecheck, 55 vitest tests, build, `npm run verify:ui` (17 checks), plus before/after full-page screenshots at 1440 and 390 including the first-screen hero assertion.

## 2026-08-31: post-generation layout rebalance (pillar panel joins the chart column)

- Problem: the 380px right rail stacked 命盘四柱 + 大运 + AI 解读 (~1400px, ~2000px once a result renders) beside a ~730px left column (collapsed summary + trend chart), leaving a large blank area under the chart — at odds with DESIGN.md's "dominant chart canvas, 320–400px explanation rail".
- Desktop split (≥1068px per the remapped `xl`) is now: left = 出生摘要条 + 命轨趋势 + 命盘四柱; right rail = 大运 + AI 解读. Narrow widths stack in the same DOM order. The aside `aria-label` is 大运与解读 and its empty state says 大运与解读将在这里生成.
- `PillarPanel` internals are untouched; its `grid-cols-2 sm:grid-cols-4` grid adapts to the wider column (four pillars render in one row at desktop).
- Verified: `tsc --noEmit`, `npm run verify:ui` against a fresh dev server (17 checks pass at 1280 and 390, no horizontal scroll, 44px targets) and the full-page screenshot — left rail is the tall one now; the right rail ends after the AI form and aligns once a result renders.

## 2026-08-31: workbench result cache (refresh-safe)

- `src/lib/workbench-cache.ts` is the single owner of the localStorage contract, key `bazi.workbench.zp1`. It holds up to eight complete history records: BirthInput, ChartSnapshot, domain `selectedPeriodId`, and the paid AnalysisOutput — so a refresh restores a chart and AI reading with zero API calls. Invalid entries are removed on load; parse failures return an empty history silently.
- Validation on restore reuses the existing owners: `BirthInputSchema` and `AnalysisOutputSchema` (zod safeParse) plus a structural guard pinning `ALGORITHM_VERSION` (an older snapshot is discarded, not rendered). snapshotKey cannot be recomputed client-side (node:crypto sha256 in `snapshot.ts`), so the guard checks shape instead: 4 natal pillars, luck cycles, non-empty native periods, their transit endpoint, and aligned domain indicators. Controls are rebuilt from the snapshot itself (dimension/resolution from `series`, anchor from `series.range.start`) — controls are never cached, so no cross-field coherence check is needed.
- Never cached: the API key (memory-only per the BYOK contract) and `boundaryAcknowledged` — a restored boundary chart reopens the form for acknowledgement and blocks AI requests until re-acked, mirroring the fresh-generation gate. A failed re-analysis erases the cached output exactly as it disappears from the screen.
- Real bug caught by the new walkthrough check: the restore effect first set `formOpen = snapshot.boundary === null` (inverted); a clean chart restored with the form open instead of the summary bar.
- Walkthrough: reload now asserts the cached chart returns without re-submitting (12 year candles, 财运 preserved) and that a corrupted cache falls back to the fresh form.

## 2026-08-31: checkbox/select state motion

- New motion token `--bazi-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)` (slight overshoot for small state changes) plus two keyframe sets in `tokens.css`: `bazi-pop-in` (scale 0.6→1 + fade) and `bazi-select-in` (fade + translateY(-4px)/scale 0.98→1). Tailwind maps `ease-spring`, `animate-pop-in`, `animate-select-in`; opacity/transform only, and the existing global reduced-motion block collapses them.
- Checkbox: the check icon is always mounted and transitions `scale-50 opacity-0 ↔ scale-100 opacity-100` with the spring ease (no conditional-render pop). Select: the trigger is a `group` so the chevron rotates 180° via `group-data-[state=open]:rotate-180`; Content enters with `data-[state=open]:animate-select-in`; the selected item's ItemIndicator check pops with `animate-pop-in`. Exit animations are intentionally omitted (Radix unmounts the popup on close; forceMount complexity is not worth it).
- Verified by computed styles sampled mid-transition (check at opacity 0.52/scale 0.76; content `animationName: bazi-select-in` at opacity 0/translateY(-4px); chevron settling at rotate(180deg)), mid/end screenshots, and the 19-check walkthrough that also covers the concurrent cache feature.
- Verified: `tsc --noEmit`, 55 vitest tests, `npm run verify:ui` (19 checks) on a fresh dev server.

## 2026-08-31: SpiralCoder DatePicker ported as a global component

- SpiralCoder has no time-of-day picker; its 时间选择器 is `web/src/components/ui/date-picker.tsx` (react-day-picker v9 + Radix Popover, CalendarClock trigger). Only the single-date `DatePicker` was ported; `DateRangePicker` was dropped (no bazi consumer). 出生时刻 stays a native time `Input` — there is no SpiralCoder source for it.
- New files: `src/components/date-picker.tsx` (zhCN locale from `react-day-picker/locale`, hand-formatted `yyyy年M月d日` caption — no direct date-fns dependency) and `src/components/popover.tsx` (Radix Popover facade whose content mirrors the Select popper: z-popup, surface-elevated, shadow-bazi-lg, backdrop-blur-xl). New dependencies: `react-day-picker@^9`, `@radix-ui/react-popover@^1`. `CONTROL_SURFACE` is now exported from `controls.tsx` as the single owner of the control-surface treatment; the DatePicker trigger consumes it so the trigger reads like an Input in form rows.
- Deviations from source per the bazi contract: day/nav/action buttons at 44px (source 36px), visible keyboard focus rings on day/nav buttons, trigger styled as an input-surface control instead of an outline Button.
- Integration: the birth form's 出生日期 is the DatePicker (id `birth-date` kept; emits ISO `YYYY-MM-DD` or null; 1900/2100 bounds via disabled matchers). Empty dates are no longer caught by native `required` — `handleSubmit`'s explicit empty-field check is the guard. DESIGN.md's global-controls paragraph now includes the DatePicker/Popover and bans native date inputs.
- Walkthrough now picks the birth date through the popover (今天, `{ exact: true }` — the calendar's today cell aria-label also contains 今天) and asserts the summary shows the run day. The 1990-05-15 fixture is gone from the walkthrough; no assertion depends on the birth date (day-view count comes from the anchor month).
- Verified: `tsc --noEmit`, 55 vitest tests, `npm run verify:ui` (19 checks), plus popover-open measurements: caption 2026年8月 (zhCN active), 42 day cells + 2 nav + 今天/清除 all ≥ 44px, popper carries the bazi token classes.

## 2026-08-31: global scrollbar treatment

- `src/styles/tokens.css` owns the scrollbar design: `--bazi-scrollbar-width` (10px gutter) plus `--bazi-scrollbar-thumb(-hover)` derived from `hsl(var(--bazi-ink-muted) / …)`, so `.dark` flips the thumb automatically with no extra overrides. Global rules: Firefox `scrollbar-width: thin` + `scrollbar-color` on `*`; Chromium `::-webkit-scrollbar` pill thumb (2px transparent border + `background-clip: padding-box` → 6px visual) with transparent track/corner. DESIGN.md material section records that screens never style scrollbars locally.
- Verification note: Playwright headless Chromium launches with `--hide-scrollbars`, so document/native scrollbars never appear in screenshots — but author-styled `::-webkit-scrollbar` boxes still render (seen in the Select and place-picker popups, light and dark). Computed `scrollbar-width: thin` on html confirms the Firefox path.

## 2026-08-31: five-element data palette

- `src/styles/tokens.css` owns the 五行 colors: per element an ink anchor + deep anchor (`--bazi-element-{wood,fire,earth,metal,water}(-deep)`, HSL triples with `.dark` overrides) and a 135° duotone `--bazi-gradient-{element}` built from the pair. Tailwind maps solid inks as `text-bazi-element-*` (under `colors.bazi.element`). DESIGN.md records the family as data encoding (五行 identity only, never UI state, never the action-blue/AI spectrum).
- Hue anchors: 木 jade-green 160°, 火 vermilion 8°, 土 amber-brown 32°, 金 gold 44°, 水 ink-azure 216° — chosen to stay readable on pearl (all ≥ ~4.5:1 at body sizes) and distinct from success/warning/danger/primary hues.
- `PillarPanel` is the only consumer: big 干支 characters and 五行分布 bars use the gradients (`background-clip: text` / bar `backgroundImage`, inline `var(--bazi-gradient-*)` per the established pattern); inline characters (日主 stem+element, 括号五行标注, per-character 藏干, 时间基准对照干支 split per char via `STEM_ELEMENTS`/`BRANCH_ELEMENTS`) use the solid inks. `ELEMENT_TEXT`/`ELEMENT_GRADIENT` maps live in the component; the `elementCounts` entries cast is now `[Element, number]`.
- Verified: `tsc --noEmit`; computed-style checks on a fresh dev server at 390px confirmed every rendered value matches the tokens exactly (light: 火 rgb(193,53,31), 木 rgb(36,127,97), 土 rgb(147,100,47), 金 rgb(167,132,37), 水 rgb(30,92,184); `.dark` toggle: 木 bar rgb(110,207,171)→rgb(61,164,143), 水 label rgb(124,180,244)), gradient text uses `background-clip: text` with transparent color, no horizontal overflow; vision-model review of desktop/mobile panel screenshots found all five colors applied with no layout breakage; `npm run verify:ui` passes all 19 checks.

## 2026-08-31: BYOK default provider and API-key portals

- `src/ai/providers.ts` owns `DEFAULT_PROVIDER_ID` and all four provider API-key console URLs. The default is DeepSeek; `AnalysisPanel` derives both its first selected provider/model and its visible key link from that owner, so changing the provider also changes the link without a parallel URL map in the component.
- The walkthrough now asserts the DeepSeek default and the official OpenAI, Anthropic, Google, and DeepSeek links. `tests/providers.test.ts` covers the same fixed-provider contract without a browser.
- Verified: `npm run typecheck`, 61 Vitest tests, `node --check scripts/ui-walkthrough.mjs`, and target-path diff checks. Browser walkthrough could not be completed because a pre-existing development-server asset failure prevented hydration; no user process was changed.

## 2026-08-31: ZP-1 deterministic judgment engine

- The legacy `src/domain/fortune` score/reason pipeline and the separate engine/scoring versions were deleted. `src/domain/bazi/snapshot.ts` now exposes the sole entry point, `calculateBaziSnapshot`, and every snapshot carries one catalog/model-fingerprinted `algorithmVersion`.
- `rules.ts` owns frozen rule data; `qi.ts`, `structure.ts`, and `favorable.ts` own the three-stage natal adjudication; `temporal.ts` reruns all time layers; `verdict.ts` owns domain evidence; and `projection.ts` only projects and aggregates K lines. Rule evidence is source-labelled and AI receives it with the selected structure and favorable elements.
- API, AI selection/prompt, local cache, chart detail, pillar panel, tests, and SPEC all use the ZP-1 contract. Old snapshots are not read or converted; the cache key is now `bazi.workbench.zp1`.
- Verified: `npm test` (61 tests), `npm run typecheck`, `npm run build`, and stale-contract search. The existing long-running dev server made `npm run verify:ui` stop at the pre-existing birthplace-popup step, so no new browser acceptance claim was made.

## 2026-08-31: ZP-1 instant, evidence, and relation-contract reconstruction

- Algorithm input is now only `birthInstant` (seconds plus an explicit offset), IANA timezone, longitude, traditional chart gender, and time standard. `localDateTime`, place name, and latitude were deleted from `BirthInput`; UI place data remains display-only and cannot enter the snapshot hash.
- `astronomy.ts` is the owner of civil-clock resolution: IANA historical offset validation, DST-overlap choice, and DST-gap rejection. 1990 Shanghai DST (`+09:00`) is an explicit golden fixture.
- Calendar solar-term strings retain seconds, so the 2024 Li Chun boundary switches at 16:27:07 rather than the displayed minute. Luck cycles now expose exact local start/end bounds and unrounded year/month/day起运 detail; active luck selection uses those bounds rather than only a year.
- Natal facts now include ordered hidden-stem facts, life stage, 纳音, 旬空, month command, and root grades. Snapshot includes an adjudicated natal relation graph and source-labelled domain verdicts; temporal relations cover blocked/contested combinations, 伏吟、反吟、天克地冲、岁运并临.
- `algorithmVersion` is now `zp-1.3.0-<rule-fingerprint>-noaa-eot-2006-lunar-typescript-1.8.6`. AI output must cite supplied deterministic rule IDs; invocation rejects invented IDs.
- Verified: `npm test` (81 passing), `npm run typecheck`, and `npm run build` (production compilation/type validation).

## 2026-08-31: ZP-1 relation re-adjudication and optional name

- `relations.ts` now re-adjudicates an original combination against every active transit branch. A moving clash can turn an otherwise formed natal combination into a source-layered `blocked` edge; relation tests cover formed, unformed, contested, blocked, and the exact moving layer that caused the block. Structure tests also cover an explicit rescue evidence path.
- `BirthInput.subjectName` is optional, trimmed, and capped at 40 characters. It is display/AI-salutation metadata only: `snapshotKey` deliberately removes it and all deterministic calculations ignore it. The name is restored from the browser-local result tuple, appears in the collapsed summary, and is passed to BYOK only with an explicit prompt instruction that it is not a chart fact.
- Verified before the next full-contract audit: `npm test` (81 passing), `tsc --noEmit`, `npm run build`, `node --check scripts/ui-walkthrough.mjs`, and `git diff --check`. The existing user-owned development server was not restarted, so this change has no new browser-walkthrough claim.

## 2026-08-31: ZP-1 Qi and relation-state closure

- The frozen Qi catalog now carries early/middle/late 节内月令 coefficients, root grades, and root-disruption deductions. `NatalChart.seasonalProgressPermille` is an exact integer fact derived from the surrounding 节 moments; `QiState` adds roots to the ledger and deducts only adjudicated blocked/broken/contested root relations with `QI_ROOT_DISRUPTED` evidence.
- Relation states are now closed as `formed`, `blocked`, `contested`, `untransformed`, and `broken`. Half-combinations and arch-combinations have their own graph codes and never score until complete. 天干相生、相克 now exist on natal and temporal graph edges. Month-command 劫财 selects 羊刃格 only when the month branch matches the single frozen day-master table.
- Verified after relation/Qi closure: a background-observed `npm test` completed with 15 files and 89 tests passing; `npm run typecheck`, `npm run build`, and `git diff --check` also pass. The background PID/log pattern avoids the desktop command observer's 30-second output cutoff without touching the user-owned development server.

## 2026-08-31: ZP-1 rule-catalog ownership

- `rules.ts` now owns the whole annotation-only 神煞 directory (天乙、文昌、禄、羊刃、驿马、桃花、华盖) as well as the Qi, relation, and structure tables. `natal.ts` derives annotations from that frozen catalog; the catalog fingerprint therefore changes whenever any traditional rule data changes. Annotation tests confirm these facts never enter Qi evidence.
- Read-only review of the user-provided 问真八字 reference showed public named-case cards with four pillars, but no auditable unique birth instants. It is useful as a product-breadth reference, not admissible independent calendar evidence under ZP-1's unique-input contract.
- Verified: rule-catalog and ZP-1 natal tests plus `tsc --noEmit`.

## 2026-08-31: ZP-1 independent civil-calendar fixture

- `tests/calendar-fixtures.test.ts` now holds an offline, independently published civil-time cross-check: 1990-05-15 14:00 must yield `庚午 辛巳 庚辰 癸未`. The expected four pillars were cross-checked against the public calendar at `https://huangli.100xgj.com/day/19900515`; the test never makes network calls, so deterministic test execution remains self-contained.
- A review of public 2024 solar-term tables found a real 14-second disagreement for Li Chun: several tables publish 16:26:53 while the current locked `lunar-typescript@1.8.6` model and another public table publish 16:27:07. ZP-1 deliberately retains its fingerprinted model's second-level boundary; this is recorded as an astronomy-model variance, not misrepresented as independent second-level agreement.
- Verified: `npm test -- --reporter=dot tests/calendar-fixtures.test.ts` (9 passing).

## 2026-08-31: ZP-1 relation adjudication edge closure

- `stateForTransform` no longer treats a lone self-punishment branch as a self-punishment: `辰刑辰` and peers require two occurrences of that branch. The previous presence-only check incorrectly blocked otherwise valid combinations whenever a single 辰、午、酉 or 亥 occurred.
- Complete 三合 and 三会 now ignore their own members when looking for soft blockers. This prevents the intrinsic 卯辰 relation inside 寅卯辰三会 from making the three-meeting transformation impossible while retaining every external 冲、害、破、刑 as a blocker.
- `tests/relations.test.ts` covers 干合、三合、三会 as formed/untransformed/broken, preserves 六合 contention coverage, and proves the one-versus-two occurrence self-punishment distinction.
- Verified: `npm run typecheck`; `npm test -- --reporter=dot` (15 files, 92 passing).

## 2026-08-31: ZP-1 exact-instant true-solar closure

- `solarCorrection` now accepts only an actual instant, never a re-resolved local wall clock. Snapshot birth correction uses the already validated `birthInstant`, preserving the selected side of a DST overlap. The obsolete local-clock-to-UTC helper was deleted.
- True-solar transit sampling enumerates every IANA-backed instant for each civil shichen start: duplicated clocks remain two points, nonexistent clocks produce no fictional point, and day/month/year aggregation takes explicit per-day endpoints instead of assuming exactly 12 points. A Pacific/Apia skipped-date fixture confirms that no K line is manufactured for 2011-12-30.
- These adjudication and temporal-result changes bump `algorithmVersion` to `zp-1.3.1-…`; cache validation therefore discards every prior ZP-1.3.0 snapshot rather than silently presenting it under changed rules.
- Verified: `npm run typecheck`; `npm test -- --reporter=dot` (15 files, 95 passing).

## 2026-08-31: ZP-1 calendar-derived structure examples

- This earlier permissive special-structure fixture set is superseded by the 2026-09-01 classical evidence pass below. Only 从强（2018-07-05）remains a positive special-structure regression; the prior 化气、从儿、从财、从官杀 samples now deliberately return to their month-command structures because they retain a failed strict gate.
- The same suite derives ordinary-state evidence through the full calendar path: 1900-01-01 yields an impaired 正印格; 1900-01-03 yields a rescued 正官格. These are rule-regression fixtures, not claims about real people or predictive validation.
- Verified: `npm test -- --reporter=dot` (15 files, 97 passing).

## 2026-08-31: ZP-1 verdict trace closure

- `DomainVerdict` now distinguishes directional `evidenceFor`/`evidenceAgainst` from `evidenceContext`. When a domain has no applicable evidence at all, it receives the explicit catalogued `INSUFFICIENT_EVIDENCE` fact (`当前规则无法确定`) rather than an untraceable empty neutral verdict.
- Snapshot-level verdict tests prove every published domain has at least one `ruleId` and an active temporal layer. This changes output semantics, so `algorithmVersion` is now `zp-1.3.2-…` and old ZP-1.3.1 cache entries cannot be rendered under the new contract.
- Verified: `npm run typecheck`; `npm test -- --reporter=dot` (16 files, 99 passing).

## 2026-08-31: ZP-1 external validation handoff

- `docs/zp1-validation.md` is the human-review packet: it names the locked model/version, calendar-derived rule fixtures, independent four-pillar source, public Li Chun second-level disagreement, and seven adjudication questions. The final table intentionally remains `待审`; it must not be read as a completed human review.
- Verified: `git diff --check` (no whitespace errors; repository-wide CRLF conversion notices only).

## 2026-08-31: ZP-1 classical-rule calendar fixture

- A primary-text rule is now tied to a non-manual calendar input: 《三命通会》卷八's 戊寅日壬子时、卯月 → 正官格 maps to 1906-04-04 00:00 (`丙午 辛卯 戊寅 壬子`) and `tests/structure.test.ts` verifies the engine classifies it as 正官格. The test deliberately excludes the source's life-outcome assertions.
- `docs/zp1-validation.md` links the primary source and separately records the month-command/破格 textual mapping as review context.
- Verified: `npm test -- --reporter=dot` (16 files, 100 passing).

## 2026-08-31: ZP-1 temporal combination contention

- `temporalRelationsOf` now builds the same complete 三合/三会 branch-use map as the natal graph before judging 六合. A natal 六合 whose branch is claimed by a moving completed combination becomes `contested` with the actual completion layer, while a prior 冲/害/破 keeps its own trigger layer and priority.
- The regression fixture has natal 午未六合 and moving 寅、戌 completing 寅午戌; it verifies `contested` at 流日. The output changes period evidence, so `algorithmVersion` is `zp-1.3.3-…`.
- Verified: `npm run typecheck`; `npm test -- --reporter=dot` (16 files, 101 passing).

## 2026-08-31: ZP-1 natal-relation evidence continuity

- `resolveFavorable` now receives the adjudicated natal relation graph and composes its normalized relation rule hits into the one `NatalJudgment.evidence` owner. `verdictsOf` unwraps relationship-state prefixes only for applicability matching, so an established, blocked, broken, or contested natal relation remains traceable in every relevant domain verdict instead of disappearing after graph construction.
- `tests/verdict.test.ts` proves a broken natal 子丑六合 reaches the relationship verdict. This changes deterministic evidence and K-line reason composition, so `algorithmVersion` is `zp-1.3.4-…`; the validation packet and version assertion use the same version.
- Verified: `npm run typecheck`; `npm test -- --reporter=dot tests/candles.test.ts` (7 passing); remaining 15 suites (95 passing), total 16 files and 102 tests passing; `git diff --check` has no whitespace errors (only repository-wide CRLF notices).

## 2026-08-31: ZP-1 display-location input closure

- `BirthInput` is now the one complete boundary for all form data that the product promises to retain: required `latitude`, optional trimmed `birthplace`, and optional `subjectName`. Longitude remains the only location value used by true-solar-time calculation. Snapshot-key construction removes all three display fields, so neither a salutation nor a place-label/latitude edit can alter deterministic chart facts or K lines.
- The workbench now submits, restores, and summarizes birthplace/latitude from the same contract; legacy local cache entries that lack required latitude are discarded by the existing strict ZP-1 cache validator rather than being converted. `SPEC.md` records the exact ownership and non-calculation role.
- Verified: `npm run typecheck`; `npm run build`; focused input, K-line, true-solar, verdict, and Qi suite (5 files, 34 passing); remaining 15 suites (96 passing), total 16 files and 103 tests passing; `git diff --check` has no whitespace errors (only repository-wide CRLF notices). The only old scoring-field search matches are negative AI-schema tests that prove obsolete inputs are rejected.

## 2026-08-31: ZP-1 cache input identity

- `Workbench` now actually submits the optional birthplace it displays. `parseWorkbenchCache` validates the snapshot's own normalized `BirthInput` and requires it to equal the stored cache input before restoring any chart or AI text. A snapshot with the current algorithm version but another longitude/name/place/time input is therefore discarded, not mislabelled as the current person.
- `tests/workbench-cache.test.ts` covers valid paired input, same-version longitude mismatch, and a legacy cache missing required latitude. This is a strict rejection path, with no cache migration or fallback read.
- Verified: `npm run typecheck`; `npm run build`; 16 non-candle test files (99 passing, including the new cache suite); `git diff --check` has no whitespace errors (only repository-wide CRLF notices). The long K-line suite was previously green; it was not re-completed in this turn because the tool's 30-second observation limit left its test process running and it was then cleaned up.

## 2026-08-31: ZP-1 full regression after cache identity closure

- The isolated K-line suite was rerun in a controlled single-thread test process and completed successfully: all 7 tests pass, including day/month/year OHLC aggregation, per-shichen composition, deterministic repeatability, selected time-standard identity, and display-metadata exclusion from the series/hash.
- Combined with the 16 non-candle files, the current full suite is 17 files and 106 passing tests. `npm run typecheck` and `npm run build` both pass; `git diff --check` has no whitespace errors (only existing CRLF conversion notices).

## 2026-08-31: External product scope comparison

- The public home of 问真八字 was checked as a product-scope reference. It visibly offers 排盘、合盘、案例/名人案例、学习课堂和会员; it does not expose a reproducible rule/version/evidence contract. `docs/zp1-validation.md` now records that it is not an algorithm authority or test-fixture source.
- ZP-1 deliberately retains only its V1 deterministic single-chart/timeline/BYOK scope. Accounts, history records, membership, social features and 合盘 remain out of scope under the product specification, rather than being copied as superficial completeness.
- Verified: browser inspection of the public JavaScript-rendered home; `git diff --check` (no whitespace errors; repository-wide CRLF notices only).

## 2026-08-31: External birth-form contract comparison

- Read-only inspection of 问真八字's public form confirmed fields for name, gender, Gregorian/lunar/manual-pillars entry, place coordinates, DST, true-solar time, early/late Zi, and case saving. The validation packet now distinguishes direct ZP-1 coverage from deliberate contract choices.
- ZP-1 uses a unique IANA-resolved explicit-offset instant instead of a DST toggle, computes late-Zi hour stem from the next day without a UI switch, rejects manual pillars, retains lunar facts as output, and excludes saved cases under V1's no-account scope. No external data was entered or submitted.
- Verified: browser DOM inspection of the public form and `git diff --check` (no whitespace errors; repository-wide CRLF notices only).

## 2026-09-01: ZP-1 instant-based solar-term correction

- `lunar-typescript` publishes its solar-term wall clock in the locked UTC+08 model. ZP-1 now converts that clock to an actual instant before comparing it with a birth or transit; it no longer compares Beijing model text with an IANA birth-place wall clock. This fixes New York 2024 Li Chun at local `03:27:07` and makes civil as well as true-solar trend points enumerate actual IANA instants.
- Year/month pillars, calendar facts, seasonal depth, 大运节气距离, and active 大运 bounds consume the same instant contract. Day/hour still use the selected civil or true-solar wall clock. The changed calendar behavior is versioned as `zp-1.4.0-…-lunar-typescript-1.8.6-cst-instant-v2`, invalidating earlier cache snapshots.
- AI now has a strict `insufficient` evidence branch: it is allowed only with no selected deterministic rule, requires the exact statement `当前规则无法确定`, and forbids invented citations. The cited branch remains mandatory whenever deterministic reasons exist.
- Verified: `npm run typecheck`; focused calendar, luck, true-solar, relation, AI-schema, and invocation suites (52 tests); the stable K-line/version fixture; `npm run build`; and `git diff --check` (no whitespace errors; CRLF notices only).
- Follow-up verification: all 16 non-K-line suites pass (103 tests). The K-line suite's stable fixture, daily aggregation, monthly aggregation, deterministic repeatability, time-standard identity, and display-metadata exclusion each pass when run independently; only the combined multi-resolution OHLC case exceeds the desktop observer's 30-second single-command window.
- The three OHLC resolutions are now independent named fixtures so the same coverage can complete inside the observer limit: day, month, and year each pass separately (the two-year year aggregation took 21 seconds; the two-year month aggregation took 23 seconds). The suite now has 9 K-line tests; together with the 16 other suites, the verified total is 112 tests.

## 2026-09-01: ZP-1 layer-normalized trend projection

- Trend projection now normalizes support and pressure within each of 原局、大运、流年、流月、流日、流时 before applying that layer's fixed weight. More active relation records in one layer can no longer mechanically force an index to 5 or 95; all actual evidence remains available to the chart, while AI selection retains at most 24 compact rule records.
- This deterministic result change is versioned as `zp-1.5.0-…`; the strict workbench cache rejects every `zp-1.4.0` snapshot rather than rendering it under the new projection. `SPEC.md` and `docs/zp1-validation.md` own the updated formula semantics and audit version.
- Verified: `npm run typecheck`; all non-candle suites; every day/month/year OHLC case plus candle determinism/cache-key and dense-evidence regression; `npm run build`; and `git diff --check`. Browser acceptance was intentionally not rerun by user request.

## 2026-09-01: AI selection excludes relation subjects

- The selected-period AI request now carries only compact rule metadata: identifier, code, label, polarity, direction, source layer, and relevant domains. `RuleHit.subjects` remains complete in the deterministic domain and chart presentation, but is neither accepted by `/api/analyze` nor interpolated into the provider prompt.
- This removes the false `subjects.max(4)` request boundary rather than widening it or passing arbitrary complete relationship payloads to DeepSeek. The DeepSeek Chat Completions contract uses JSON Output (`response_format: { type: "json_object" }`) plus an explicit JSON prompt; the existing adapter already conforms.
- Verified: focused AI schema/invocation tests (20 passing), `npm run typecheck`, `npm run build`, and `git diff --check`. Browser verification was not run by user request.

## 2026-09-01: ZP-1 full-index K-line and explicit trend range

- The deterministic trend contract owns both the 0–100 index and each resolution's maximum selectable span. Projection uses all rule evidence, applies fixed temporal-layer weights to damped within-layer balances, and only then creates compact chart/AI reasons. That previous full-index contract is superseded by the native time-evidence workbench below.
- The chart has one explicit inclusive `TrendRange`: both dates are editable, arrows shift that exact span, and stale chart requests cannot replace the newest selection. Aggregate candles draw the actual absolute open/close body with real high/low wicks, while atomic shichen points do not pretend to be candles.

## 2026-09-01: native BaZi time-evidence workbench

- `src/domain/bazi/contract.ts` has one native `TrendSeries.periods` contract: `shichen` emits atomic `TrendPoint` records with exact instants, while `day | month | year` emit `Candle` records with OHLC, exact close instant, and active transit pillars. `projection.ts` owns all aggregation, a causal five-period 命势中轴, and aligned 变势强度; components do not derive either value.
- The workbench, local history, API, AI selection, and prompts now select the domain-issued `periodId`, never a viewport index or timestamp. This preserves selection through zooming, range changes, history replay, and both occurrences of an IANA DST overlap. Cache schema and algorithm version are `zp-1.7.0-…`; earlier snapshots are rejected rather than migrated.
- `TrendChart` is one low-chrome keyboard-focusable evidence canvas with crosshair, pointer pan, Shift-wheel/button zoom, and a persistent rule-evidence inspector. It deliberately contains no trading vocabulary, market indicators, or fabricated intraday OHLC.
- Verified: `npm run typecheck` and 129 Vitest tests pass, including API acceptance/rejection, atomic points, DST overlap identities, aggregation, domain indicators, cache validation, and AI prompt/selection boundaries. A browser walkthrough was updated for the new semantics but could not finish because the pre-existing local Next listener exited; a later `next build` compiled successfully then hit its stale ignored `.next` cache missing `/_document`. The sandbox rejected removal of that generated cache, so visual/browser acceptance remains an environmental follow-up rather than a product claim.

## 2026-09-01: professional detail and closed shensha annotations

- `src/domain/bazi/rules.ts` is the one owner of the expanded closed shensha lookup catalog; `shensha.ts` emits stable annotation facts with the natal reference and matched target. These annotations are excluded from Qi, structure, favorable elements, verdicts, and trend projection by contract and regression tests.
- Natal output now includes deterministic 胎元、胎息、命宫、身宫. Every atomic or aggregate period owns its exact endpoint transit, and `professional.ts` builds the displayed natal/moving pillar detail without recalculation in React.
- `ProfessionalPanel` exposes 命盘总览、岁运细盘、神煞注记、规则依据 in the existing pearl workbench. Aggregate detail explicitly describes its close-instant semantics, and the shensha boundary plus lookup references remain visible rather than hover-only.
- Follow-up verification: `npm run typecheck`; all 21 Vitest files (129 tests); a clean `npm run build`; and the complete Playwright desktop/mobile walkthrough. The walkthrough confirms shensha references and boundaries, endpoint semantics, history/keyboard/resolution flows, no horizontal scroll, 44px touch targets, and no browser console/page errors.

## 2026-09-01: professional-detail Chinese presentation

- `ProfessionalPanel` now translates internal pillar-position and seasonal/root/climate enum values into Chinese reading labels before rendering. Normal relationship and evidence cards show involved pillars and applicable dimensions, never raw `GAN_*`/`ZHI_*` codes or full rule IDs.
- Verified: focused professional presentation tests, `npm run typecheck`, and the full desktop/mobile UI walkthrough, including explicit assertions that no internal identifiers or English enum values are visible in the professional evidence view.

## 2026-09-01: shensha literature evidence contract

- `src/domain/bazi/shensha-evidence.ts` is the single owner of every active shensha code's source grade, work, section, public link, and lookup basis. Each emitted annotation carries that immutable record; the professional shensha view discloses it, and cache validation rejects legacy snapshots without it.
- The literature directory is `docs/shensha-evidence.md`: it lists all 30 current runtime entries plus the complete 23-section table of 《三命通会》卷三. Directly located checks newly add 德秀贵人 and 六厄; entries with only a project table or a disputed interpretation remain explicitly marked 待原典核验 or 流派变体, never as confirmed literature.
- Verified: full Vitest suite (22 files, 133 tests), `npm run typecheck`, `npm run build`, `git diff --check`; the desktop browser walkthrough passed the new literature-grade disclosure assertion before an unrelated later segment of the long existing walkthrough stopped making progress.

## 2026-09-01: classical evidence pass and strict special-structure gates

- `TRUE_TRANSFORM_MONTHS` now freezes the five 《滴天髓·化气》 month-command gates. A 化气格 additionally requires an already formed 五合, exactly one of each paired stem, and stronger transform qi; a visible five-combination alone returns to the month-command structure. Weak 从儿/从财/从官杀 candidates now require no root and no non-day pillar 比劫/印星 stem or hidden-stem support; otherwise the emitted evidence is `QI_FOLLOW_BLOCKED` and the ordinary structure remains authoritative.
- `docs/classical-evidence.md` and the professional “规则依据” tab distinguish the implemented monthly-structure/化从/旺衰 layers from the still-unencoded 《穷通宝鉴》 ten-day-master × twelve-month climate table. The current coarse climate output must not be described as a full 《穷通宝鉴》 implementation.
- Shensha evidence was corrected rather than inflated: 天厨、华盖、将星 are now direct primary-text entries; 福星、飞刃 are visible 流派变体, while 国印、天医 remain pending. The annotation-only boundary is unchanged.
- Verified: all 22 Vitest files (136 tests), `npm run typecheck`, `npm run build`, `git diff --check`; desktop browser walkthrough passed the new literature-boundary assertion, and the completed walkthrough generated desktop/mobile screenshots (its final detached exit code was not observable after the tool timeout).

## 2026-09-01: qiong-tong climate directive contract

- `src/domain/bazi/qiong-tong-climate.ts` is now the sole executable 《穷通宝鉴》调候 table: it freezes all 120 day-master × month-command base clauses plus the explicitly modeled solar-term, jie-stage, and dominant-element overrides. Solar-term gates use the unique birth instant through the same model-clock path as the year/month pillars, not a corrected display wall clock. Each result contains the matched clause ID, source location, primary stems, secondary stems, and matched conditions.
- The coarse `QiState.climate` and `NatalJudgment.climateNeed` / `balanceNeed` / `remedyElement` / `favorableElements` fields are removed. `NatalJudgment.climate` and ordered `elementDirectives` are the only current contract. Primary climate directives have severity 3, secondary 2, and special/balance/remedy directives 1; temporal evidence uses that same priority rather than a generic favorable-element branch.
- AI selection and prompts, the pillar panel, and the professional rule-evidence tab consume the same directive contract. The professional display exposes source, section, locator, clause ID, conditions, primary and secondary choices, and no longer describes a generic cold/warm/dry/wet need.
- Verified: `npm run typecheck`; all 23 Vitest files (139 tests), including 120-cell coverage, source ownership, a real base clause, an explicit summer-solstice override, and directive rank assertions; `npm run build`; `git diff --check`; stale-contract search returned no obsolete field or rule identifier.
