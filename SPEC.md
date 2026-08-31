# Bazi AI V1 specification

## Purpose

Bazi AI turns a user's birth information into a reproducible traditional BaZi calculation snapshot, a selectable year, month, or day trend chart, and an optional user-funded AI explanation. It is a cultural and entertainment analysis product, not a medical, legal, investment, fertility, or certainty-prediction system.

## V1 user flow

1. The UI optionally records the user's name and birthplace for display, resolves the Gregorian local date/time to one offset-bearing birth instant, then submits that instant, traditional chart gender, timezone, longitude, latitude, and a time standard. Only name, birthplace, and latitude are display metadata; they do not affect deterministic facts.
2. The calculation endpoint returns the civil time, true solar time, correction amount, selected chart basis, natal pillars, luck cycles, and the requested trend-series window.
3. The user switches yearly, monthly, or daily resolution and selects a period.
4. The user optionally supplies a model-provider key and model identifier.
5. The analysis endpoint sends the selected deterministic snapshot to that provider and returns a validated narrative.

## Input contract

BirthInput is the only engine input contract:

    subjectName: optional display and AI-salutation metadata
    birthplace: optional display metadata
    birthInstant: ISO-8601 instant with seconds and an explicit UTC offset
    chartGender: male or female
    timezone: IANA timezone
    longitude: decimal degrees
    latitude: decimal degrees, display metadata
    timeStandard: civil or trueSolar

The declared offset must equal the IANA historical offset at `birthInstant`. The UI resolves ordinary local clocks automatically, requires an explicit offset in a DST overlap, and rejects a DST-gap clock. Name, place name, and latitude are display-only metadata and never enter the engine hash or any deterministic calculation. A name may be sent to the selected BYOK provider only as a salutation. The UI computes and shows both civil and true-solar candidates whenever possible, but each ChartSnapshot has exactly one selected timeStandard. If a correction changes the local day or shichen, the user must acknowledge the boundary before requesting AI analysis.

Manual four-pillar input is out of scope. It cannot determine a unique Gregorian moment or a reliable luck-cycle start.

## Deterministic engine

ChartSnapshot is created only by `src/domain/bazi` through `calculateBaziSnapshot`:

    algorithmVersion
    normalized birth input
    civil-time candidate
    true-solar-time candidate
    selected natal chart
    qi assessment and primary-structure judgment
    luck cycles
    requested trend series

The engine must calculate:

- Gregorian, lunar, and solar-term facts;
- four pillars, hidden stems (本气/中气/余气), ten gods, twelve life stages, 纳音, 旬空, root grades, and element relation facts;
- luck-cycle direction and start;
- annual, monthly, daily, and shichen transit facts;
- source-labelled rule evidence plus an adjudicated relation graph for favorable, challenging, and contextual relations;
- scores for overall, career, wealth, relationship, children, family, health, and study.

ZP-1 is the only interpretive profile. It evaluates month command (including the exact position inside its 节 interval), hidden-stem roots, exposed stems, five-element support and pressure, climate, flow, primary structure, favorable/adverse elements, and the active luck pillar before projecting a trend. `src/domain/bazi/rules.ts` owns the closed rule catalog and its fingerprint; `relations.ts` owns relation adjudication; `verdict.ts` owns domain evidence. A visible combination is explicitly `formed`, `blocked`, `contested`, `untransformed`, or `broken`; half-combinations and arch-combinations are distinct untransformed edges, not concealed three-combinations. The old base-score and weighted-reason model does not exist.

Every rule conclusion records its stable rule identifier, source layer, subjects, semantic polarity, numeric direction (`-1 | 0 | 1`), severity, and relevant domains. A trend value is a bounded visualization of those activated rules, not the source of a conclusion. The projection formula is fixed as `round(50 + 45 × (positive - negative) / (positive + negative + 1))`, then bounded to 5–95. `algorithmVersion` includes the frozen rule-catalog fingerprint plus the pinned astronomy/calendar model revisions; the selected time standard is included in the snapshot key and all temporal calculations.

## Trend-series contract

The smallest series point is a shichen. It has timestamp, per-dimension projection values, source-labelled rule evidence, and change intensity. The active luck pillar participates alongside annual, monthly, daily, and shichen transit pillars.

Daily candles aggregate twelve shichen points:

    open  = first shichen score
    close = final shichen score
    high  = maximum shichen score
    low   = minimum shichen score

Monthly candles aggregate daily candles. Yearly candles aggregate monthly candles. The aggregation implementation has one owner and must preserve low <= open, close <= high at every resolution. The overall value is calculated from general rule evidence; it is never the mean of the seven other dimensions.

The chart label is 传统命理趋势指数, ranged from 0 to 100. It is not a market price, return, probability, diagnosis, or guarantee.

## API boundary

POST /api/chart accepts BirthInput, range, dimension, and resolution. It returns ChartSnapshot and a deterministic candle series. It never calls an LLM.

POST /api/analyze accepts a compact ChartSnapshot selection, provider preset, model identifier, and one transient API key. It returns AnalysisOutput only after schema validation.

AnalysisOutput contains:

    summary
    dimension interpretations
    opportunities
    cautions
    selected-period explanation
    cultural-entertainment disclaimer

The output schema deliberately excludes numeric scores, candle values, diagnoses, guaranteed events, investment instructions, medical advice, and claims about death, disaster, fertility, or exact marriage timing.

## BYOK contract

V1 exposes fixed provider presets: OpenAI, Anthropic, Google, and DeepSeek. Each preset owns its endpoint and adapter. The user may choose a model identifier available to that provider.

The API key is request-only:

- browser memory is the default storage;
- sessionStorage may be offered as an explicit current-tab convenience;
- the key is not written to a database, application log, analytics event, cookie, repository file, or Vercel environment variable;
- no arbitrary base URL is accepted in a public route.

The provider receives the calculated facts needed for the selected analysis and the user's request. The UI states this before the first analysis request.

## Deployment

V1 is one TypeScript Next.js App Router repository deployed to Vercel. Calculation and analysis run in Node.js route handlers. There is no separate backend service, database, cache, queue, or cron job.

If a later requirement introduces accounts, saved reports, or share links, add one Neon Postgres integration through Vercel Marketplace. Save snapshots and reports, never user model keys.

## Acceptance criteria

- A known birth fixture returns stable pillars and luck-cycle data.
- A true-solar-time boundary fixture displays both candidates and uses the selected one consistently.
- The same BirthInput and engine version always return the same series.
- Every aggregate candle respects the OHLC invariant and agrees with its lower-level points.
- The chart resolution switch preserves the selected dimension and selected time standard.
- A malformed AI response is rejected rather than rendered.
- AI output cannot change deterministic projections, judgment, or rule evidence.
- A period's active luck pillar must affect its deterministic rule evidence and projection.
- No legacy scoring configuration, fixed base score, or legacy reason contract remains in source or API output.
- No API key appears in source, persisted storage by default, logs, test snapshots, or returned response bodies.
