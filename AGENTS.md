# AGENTS.md

## Product boundary

Bazi AI is a Chinese-language web application for reproducible traditional BaZi trend analysis. The deterministic engine owns calendar conversion, true-solar-time correction, natal chart calculation, luck cycles, dimension scores, and candlestick aggregation. An LLM may explain those facts, but must never invent, alter, or calculate them.

The current V1 scope is:

- birth information input and explicit time-standard selection;
- natal chart, luck-cycle, annual, monthly, daily, and shichen-level deterministic data;
- year, month, and day candlesticks;
- BYOK AI interpretation for the whole chart or a user-selected period;
- deployment as one Next.js application on Vercel.

Do not add accounts, sharing, a database, payments, background jobs, a social feed, arbitrary provider URLs, or an autonomous agent until the product specification is explicitly changed.

## Required reading

Before editing UI, read DESIGN.md, src/styles/tokens.css, tailwind.config.cjs, and src/lib/typography.ts. Together they are the visual source of truth migrated from SpiralCoder. The archived Apple reference at docs/reference/getdesign-apple.md is inspiration only and must not override them.

Before changing product behavior, read SPEC.md and MEMORY.md. Update MEMORY.md only after a decision is implemented and verified.

## Code ownership

- src/domain/bazi owns the complete deterministic contract: instant normalization, civil-time and true-solar-time conversion, calendar facts, natal facts, rules, relations, judgment, luck cycles, verdicts, timeline generation, and candle aggregation.
- src/ai owns provider selection, prompts, output schema, and model invocation.
- src/app/api only validates HTTP input and orchestrates the domain and AI layers.
- src/components renders UI only. It must not recalculate chart facts or score candles.
- src/styles/tokens.css is the only owner of visual tokens. tailwind.config.cjs maps those tokens to semantic utilities, and src/lib/typography.ts owns reusable text class compositions. Components consume these owners; they do not introduce raw colors, arbitrary radii, or parallel theme variables.

Each domain contract has one owner. Do not retain deprecated fields, fallback calculations, dual time standards, duplicated scores, or provider-specific behavior outside src/ai.

## Implementation rules

- Use TypeScript with strict runtime validation at request boundaries.
- Accept one offset-bearing birth instant (seconds required), traditional chart gender, timezone, longitude, and one chosen time standard. An optional name, place name, and latitude are display-only metadata and must not enter deterministic calculation or the algorithm hash; a name may be passed to BYOK only as a salutation. Do not treat four manually typed pillars as a sufficient V1 input.
- The selected time standard is part of every calculation cache key and output snapshot.
- Every result contains one `algorithmVersion` whose fingerprint/revisions cover the frozen rule catalog and calendar/astronomy model data.
- A candle is an aggregation of lower-level deterministic points. It is not an LLM-generated visualization.
- Default to fixed model-provider presets. The user enters a key and model identifier; do not accept arbitrary base URLs in a public route.
- Keep a user API key in browser memory by default. It may traverse the analysis request for one invocation, but must never be persisted, logged, sent to analytics, or put in a Vercel environment variable.
- Return a structured, validated AI response. Do not render unchecked model HTML or use an LLM response as a source of numeric scores.
- Use Node.js route handlers on Vercel for the calculation and AI paths. Do not select Edge merely for streaming.
- Keep files and functions narrow. Prefer direct modules over single-use abstractions.

## UI rules

- Match the liquid-glass, pearl-canvas, dense-but-calm visual language in DESIGN.md.
- Use a real DOM element for every visible control, indicator, status, and decoration. Do not fake product UI with pseudo-elements.
- Use meaningful Chinese labels with verb plus object. Errors state the next action; empty states invite one clear action.
- Keep cards flat: use surfaces and fine borders for hierarchy. Shadows are reserved for a chart or media visual that needs depth.
- Respect reduced motion, keyboard focus, 44px touch targets, and the responsive breakpoints specified in DESIGN.md.

## Verification

For a calculation change, add or update deterministic fixtures for solar-term boundaries, Li Chun, leap months, true-solar-time boundary crossings, luck-cycle direction, and candle aggregation. Verify identical input produces identical snapshots.

For a contract change, verify the new valid path, reject obsolete input, search for stale field names, and review the diff.

For an AI change, test schema-valid output, rejected malformed output, and the invariant that AI output cannot modify deterministic scores.

For a UI change, run the project typecheck and inspect the changed screen at desktop and mobile widths when a runnable app exists. Do not claim browser validation when it was not run.
