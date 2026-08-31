# Bazi AI V1 specification

## Purpose

Bazi AI turns a user's birth information into a reproducible traditional BaZi calculation snapshot, a selectable year, month, or day trend chart, and an optional user-funded AI explanation. It is a cultural and entertainment analysis product, not a medical, legal, investment, fertility, or certainty-prediction system.

## V1 user flow

1. The user provides Gregorian birth date, exact local time, traditional chart gender, birthplace, timezone, longitude, latitude, and a time standard.
2. The calculation endpoint returns the civil time, true solar time, correction amount, selected chart basis, natal pillars, luck cycles, and the requested trend-series window.
3. The user switches yearly, monthly, or daily resolution and selects a period.
4. The user optionally supplies a model-provider key and model identifier.
5. The analysis endpoint sends the selected deterministic snapshot to that provider and returns a validated narrative.

## Input contract

BirthInput is the only V1 input contract:

    calendar: gregorian
    localDateTime: ISO local date and time
    chartGender: male or female
    timezone: IANA timezone
    birthplace: display name
    longitude: decimal degrees
    latitude: decimal degrees
    timeStandard: civil or trueSolar

The UI computes and shows both civil and true-solar candidates whenever possible, but each ChartSnapshot has exactly one selected timeStandard. If a correction changes the local day or shichen, the user must acknowledge the boundary before requesting AI analysis.

Manual four-pillar input is out of scope. It cannot determine a unique Gregorian moment or a reliable luck-cycle start.

## Deterministic engine

ChartSnapshot is created only by src/domain/bazi and src/domain/fortune:

    engineVersion
    scoringProfileVersion
    normalized birth input
    civil-time candidate
    true-solar-time candidate
    selected natal chart
    luck cycles
    requested trend series

The engine must calculate:

- Gregorian, lunar, and solar-term facts;
- four pillars, hidden stems, ten gods, and element relation facts;
- luck-cycle direction and start;
- annual, monthly, daily, and shichen transit facts;
- explicit factor codes for beneficial and challenging relations;
- scores for overall, career, wealth, relationship, children, family, health, and study.

The initial scoring owner is ScoringProfileV1. It uses a documented and versioned traditional-rule rubric. A profile change increments scoringProfileVersion; it never silently changes historical output.

## Trend-series contract

The smallest series point is a shichen. It has timestamp, per-dimension scores, factor codes, and change intensity.

Daily candles aggregate twelve shichen points:

    open  = first shichen score
    close = final shichen score
    high  = maximum shichen score
    low   = minimum shichen score

Monthly candles aggregate daily candles. Yearly candles aggregate monthly candles. The aggregation implementation has one owner and must preserve low <= open, close <= high at every resolution.

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
- AI output cannot change deterministic scores or factors.
- No API key appears in source, persisted storage by default, logs, test snapshots, or returned response bodies.
