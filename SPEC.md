# Bazi AI V1 specification

## Purpose

Bazi AI turns a user's birth information into a reproducible traditional BaZi calculation snapshot, a selectable time-evidence workbench at shichen, day, month, or year grain, and an optional user-funded AI explanation. It is a cultural and entertainment analysis product, not a medical, legal, investment, fertility, or certainty-prediction system.

## V1 user flow

1. The UI optionally records the user's name and birthplace for display, resolves the Gregorian local date/time to one offset-bearing birth instant, then submits that instant, traditional chart gender, timezone, longitude, latitude, and a time standard. Only name, birthplace, and latitude are display metadata; they do not affect deterministic facts.
2. The calculation endpoint returns the civil time, true solar time, correction amount, selected chart basis, natal pillars, luck cycles, and the requested trend-series window.
3. The user switches shichen, yearly, monthly, or daily resolution and explores a domain-issued time period.
4. The user optionally supplies a model-provider key and model identifier.
5. The analysis endpoint sends the selected deterministic snapshot to that provider and returns a validated narrative.
6. The browser retains the most recent eight successful analysis records locally. Selecting a record restores its validated chart snapshot, selected period, and saved AI narrative without another chart or AI request. API keys and boundary acknowledgement are never stored.

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
- four pillars, hidden stems (本气/中气/余气), ten gods, twelve life stages, 纳音, 旬空, root grades, element relation facts, and the auxiliary 胎元、胎息、命宫、身宫 pillars;
- a closed shensha annotation catalog for natal and moving pillars, with the triggering natal reference and matched target preserved on every fact;
- luck-cycle direction and start;
- annual, monthly, daily, and shichen transit facts;
- source-labelled rule evidence plus an adjudicated relation graph for favorable, challenging, and contextual relations;
- scores for overall, career, wealth, relationship, children, family, health, and study.

ZP-1 is the only interpretive profile. It evaluates month command (including the exact position inside its 节 interval), hidden-stem roots, exposed stems, five-element support and pressure, climate, flow, primary structure, favorable/adverse elements, and the active luck pillar before projecting a trend. `src/domain/bazi/rules.ts` owns the closed rule catalog and its fingerprint; `relations.ts` owns relation adjudication; `verdict.ts` owns domain evidence. A visible combination is explicitly `formed`, `blocked`, `contested`, `untransformed`, or `broken`; half-combinations and arch-combinations are distinct untransformed edges, not concealed three-combinations. The old base-score and weighted-reason model does not exist.

Shensha is an annotation-only output contract. It may be displayed for the natal pillars and a selected luck/transit pillar, but it never enters qi assessment, structure judgment, favorable-element selection, domain verdicts, or trend projection. A shensha label without its triggering reference and matched target is not a complete fact.

Every rule conclusion records its stable rule identifier, source layer, subjects, semantic polarity, numeric direction (`-1 | 0 | 1`), severity, and relevant domains. A trend value is a bounded visualization of those activated rules, not the source of a conclusion. Within each active source layer, support and pressure form the damped balance `(support - pressure) / (support + pressure + 4)`; fixed layer weights produce the weighted mean `B`. The projection formula is `round(50 + 30 × B)`, bounded to the full 0–100 index. A layer can approach but never exceed its fixed influence, so duplicate relations cannot mechanically force an endpoint. Full deterministic evidence is used to calculate the index; compact chart/AI reason lists are selected afterward. `algorithmVersion` includes the frozen rule-catalog fingerprint plus the pinned astronomy/calendar model revisions; the selected time standard is included in the snapshot key and all temporal calculations.

## Trend-series contract

The smallest series point is a shichen. It is an atomic observation with a civil timestamp, exact offset-bearing instant, per-dimension projection value, source-labelled rule evidence, and change intensity; it never has invented OHLC fields. Its stable `id` is `shichen:<exact instant>`, so repeated wall-clock time in an IANA DST overlap remains selectable without ambiguity. The active luck pillar participates alongside annual, monthly, daily, and shichen transit pillars.

Daily candles aggregate every real shichen point in the civil day (normally twelve; an IANA DST overlap can contain thirteen):

    open  = first shichen score
    close = final shichen score
    high  = maximum shichen score
    low   = minimum shichen score

Daily candles aggregate twelve shichen points; monthly candles aggregate daily candles; yearly candles aggregate monthly candles. Aggregate period IDs are `<resolution>:<timestamp>`. Every aggregate period preserves its exact `closeInstant` and the corresponding luck/year/month/day/hour transit pillars, so professional detail shows the interval endpoint instead of inventing a single pillar set for the whole interval. The aggregation implementation has one owner and must preserve low <= open, close <= high at every aggregate resolution. `TrendIndicators` is domain-owned and aligned one-for-one with displayed periods: 命势中轴 is the causal trailing five-period mean, and 变势强度 is the absolute change from the preceding displayed value (the first is zero). The overall value is calculated from general rule evidence; it is never the mean of the seven other dimensions. `TrendRange` is an explicit inclusive start/end contract: the shichen view opens one day, day opens a natural month, month opens 24 months, and year opens 12 years, while users can set either boundary within that resolution's maximum span. Previous/next moves the current inclusive span as a whole.

The chart label is 传统命理趋势指数, ranged from 0 to 100. It is not a market price, return, probability, diagnosis, or guarantee.

## API boundary

POST /api/chart accepts BirthInput, range, dimension, and one of `shichen | day | month | year`. It returns ChartSnapshot and one deterministic period series: atomic points at shichen, otherwise OHLC candles. It never calls an LLM.

POST /api/analyze accepts a compact ChartSnapshot selection, provider preset, model identifier, and one transient API key. Each selected rule carries its identifier, label, polarity, direction, layer, and relevant domains; complete relation subjects remain inside the deterministic engine. It returns AnalysisOutput only after schema validation.

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
- Each shichen is an exact atomic evidence point, including both real instants in a DST overlap; every aggregate candle respects the OHLC invariant and agrees with its lower-level periods.
- The chart resolution switch preserves the selected dimension and selected time standard; selection and local history use a domain period ID, never a viewport index.
- A malformed AI response is rejected rather than rendered.
- AI output cannot change deterministic projections, judgment, or rule evidence.
- A period's active luck pillar must affect its deterministic rule evidence and projection.
- Professional detail must reproduce the selected period's domain-owned endpoint transit, and shensha annotations must remain absent from projection evidence.
- No legacy scoring configuration, fixed base score, or legacy reason contract remains in source or API output.
- No API key appears in source, persisted storage by default, logs, test snapshots, or returned response bodies.
