/** K-line projection and OHLC aggregation; temporal judgment stays in temporal.ts. */
import { enumerateDays } from "./calendar";
import { instantCandidatesForCivil, solarCorrection, shiftLocalDateTime } from "./astronomy";
import { DIMENSION_KEYS, TREND_INDEX_RANGE, TREND_RANGE_LIMITS, type Candle, type ChartSnapshot, type Dimension, type DimensionScores, type NatalChart, type NatalJudgment, type Resolution, type RuleHit, type SeriesPoint, type TransitPillars, type TrendIndicators, type TrendPeriod, type TrendPoint, type TrendRange, type TrendSeries } from "./contract";
import { assessTemporal, segmentTableFor, selectSeriesEvidence, TEMPORAL_LAYER_WEIGHT, transitPillarsAt } from "./temporal";

const SHICHEN_START_HOURS = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];

export class RangeTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RangeTooLargeError";
  }
}

const PROJECTION_CENTER = 50;
const PROJECTION_AMPLITUDE = 30;
const LAYER_EVIDENCE_DAMPING = 4;
const TREND_CENTER_WINDOW = 5;

const PROJECTION_LAYER_WEIGHT: Record<RuleHit["temporalLayer"], number> = {
  原局: 1,
  ...TEMPORAL_LAYER_WEIGHT,
};

/**
 * A layer's influence is fixed by its temporal weight, not by how many
 * relation records happen to be active inside it. Severity decides the
 * support/pressure split within that layer before it enters the projection.
 */
function evidenceBalance(evidence: RuleHit[]): number {
  const byLayer = new Map<RuleHit["temporalLayer"], { support: number; pressure: number }>();
  for (const hit of evidence) {
    if (hit.direction === 0) continue;
    const totals = byLayer.get(hit.temporalLayer) ?? { support: 0, pressure: 0 };
    if (hit.direction > 0) totals.support += hit.severity;
    if (hit.direction < 0) totals.pressure += hit.severity;
    byLayer.set(hit.temporalLayer, totals);
  }
  let weightedBalance = 0;
  let activeWeight = 0;
  for (const [layer, totals] of byLayer) {
    const magnitude = totals.support + totals.pressure;
    if (magnitude === 0) continue;
    const weight = PROJECTION_LAYER_WEIGHT[layer];
    weightedBalance += weight * (totals.support - totals.pressure) / (magnitude + LAYER_EVIDENCE_DAMPING);
    activeWeight += weight;
  }
  return activeWeight === 0 ? 0 : weightedBalance / activeWeight;
}

function projectScore(evidence: RuleHit[]): number {
  const score = Math.round(PROJECTION_CENTER + PROJECTION_AMPLITUDE * evidenceBalance(evidence));
  return Math.max(TREND_INDEX_RANGE.min, Math.min(TREND_INDEX_RANGE.max, score));
}

/** Projects deterministic verdict evidence to a bounded culture-and-entertainment index. */
export function projectTemporal(transit: ReturnType<typeof assessTemporal>): { scores: DimensionScores; reasons: RuleHit[]; verdicts: SeriesPoint["verdicts"] } {
  const scores = {} as DimensionScores;
  for (const dimension of DIMENSION_KEYS) {
    const verdict = transit.verdicts[dimension];
    const evidence = dimension === "overall"
      ? transit.evidence
      : [...verdict.evidenceFor, ...verdict.evidenceAgainst];
    scores[dimension] = projectScore(evidence);
  }
  return { scores, reasons: selectSeriesEvidence(transit.evidence), verdicts: transit.verdicts };
}

/** Compatibility-free public temporal projection helper for deterministic tests. */
export function evaluateTransit(
  input: import("./normalize").BirthInput,
  natal: NatalChart,
  judgment: NatalJudgment,
  transit: TransitPillars,
): { scores: DimensionScores; reasons: RuleHit[]; verdicts: SeriesPoint["verdicts"] } {
  return projectTemporal(assessTemporal({ input, natal, judgment, transit }));
}

export function buildTrendSeries(args: {
  input: import("./normalize").BirthInput;
  natal: NatalChart;
  judgment: NatalJudgment;
  luck: ChartSnapshot["luck"];
  range: TrendRange;
  dimension: Dimension;
  resolution: Resolution;
}): TrendSeries {
  const { input, natal, judgment, luck, range, dimension, resolution } = args;
  const days = enumerateDays(range.start, range.end);
  const limit = TREND_RANGE_LIMITS[resolution];
  if (days.length === 0 || days.length > limit.maxDays) throw new RangeTooLargeError(limit.label);
  const table = segmentTableFor(range);
  const shichenPoints: SeriesPoint[] = [];
  const dailyCandles: Candle[] = [];
  for (const day of days) {
    const points: SeriesPoint[] = SHICHEN_START_HOURS.flatMap((hour) => {
      const timestamp = `${day}T${String(hour).padStart(2, "0")}:00`;
      const instants = instantCandidatesForCivil(input.timezone, timestamp);
      return instants.map((instant) => {
        const correction = input.timeStandard === "trueSolar" ? solarCorrection(input.timezone, input.longitude, instant).totalMinutes : 0;
        const evaluated = correction === 0 ? timestamp : shiftLocalDateTime(timestamp, correction);
        const transit = transitPillarsAt(table, evaluated, instant, luck);
        const projected = projectTemporal(assessTemporal({ input, natal, judgment, transit }));
        return { timestamp, instant, transit, scores: projected.scores, reasons: projected.reasons, verdicts: projected.verdicts };
      });
    });
    if (points.length === 0) continue;
    shichenPoints.push(...points);
    if (resolution !== "shichen") {
      dailyCandles.push(aggregateCandle("day", day, points.map((point) => point.scores[dimension]), points));
    }
  }
  if (resolution === "shichen") {
    if (shichenPoints.length === 0) throw new RangeTooLargeError("所选区间不含可计算的民用时刻");
    return completeTrendSeries(
      resolution,
      dimension,
      range,
      shichenPoints.map((point): TrendPoint => ({
        kind: "point",
        id: `shichen:${point.instant}`,
        timestamp: point.timestamp,
        instant: point.instant,
        transit: point.transit,
        value: point.scores[dimension],
        reasons: point.reasons,
        intensity: 0,
      })),
    );
  }
  if (dailyCandles.length === 0) throw new RangeTooLargeError("所选区间不含可计算的民用时刻");
  return aggregateUp(resolution, dailyCandles, dimension, range);
}

function aggregateCandle(resolution: Exclude<Resolution, "shichen">, timestamp: string, values: number[], points: SeriesPoint[]): Candle {
  const endpoint = points.at(-1)!;
  return {
    kind: "candle",
    id: `${resolution}:${timestamp}`,
    timestamp,
    closeInstant: endpoint.instant,
    transit: endpoint.transit,
    open: values[0],
    close: values[values.length - 1],
    high: Math.max(...values),
    low: Math.min(...values),
    reasons: capEvidence(points.flatMap((point) => point.reasons)),
    intensity: 0,
  };
}

function aggregateUp(resolution: Exclude<Resolution, "shichen">, dailyCandles: Candle[], dimension: Dimension, range: TrendRange): TrendSeries {
  if (resolution === "day") return completeTrendSeries(resolution, dimension, range, dailyCandles);
  const monthCandles = groupCandles("month", dailyCandles, (candle) => candle.timestamp.slice(0, 7));
  if (resolution === "month") return completeTrendSeries(resolution, dimension, range, monthCandles);
  return completeTrendSeries(resolution, dimension, range, groupCandles("year", monthCandles, (candle) => candle.timestamp.slice(0, 4)));
}

function groupCandles(resolution: Exclude<Resolution, "shichen" | "day">, candles: Candle[], keyOf: (candle: Candle) => string): Candle[] {
  const groups = new Map<string, Candle[]>();
  for (const candle of candles) groups.set(keyOf(candle), [...(groups.get(keyOf(candle)) ?? []), candle]);
  return [...groups.entries()].map(([timestamp, bucket]) => ({
    kind: "candle",
    id: `${resolution}:${timestamp}`,
    timestamp,
    closeInstant: bucket.at(-1)!.closeInstant,
    transit: bucket.at(-1)!.transit,
    open: bucket[0].open,
    close: bucket[bucket.length - 1].close,
    high: Math.max(...bucket.map((candle) => candle.high)),
    low: Math.min(...bucket.map((candle) => candle.low)),
    reasons: capEvidence(bucket.flatMap((candle) => candle.reasons)),
    intensity: 0,
  }));
}

function completeTrendSeries(resolution: Resolution, dimension: Dimension, range: TrendRange, periods: TrendPeriod[]): TrendSeries {
  const withIntensity = withPeriodIntensity(periods);
  return {
    resolution,
    dimension,
    range,
    periods: withIntensity,
    indicators: indicatorsOf(withIntensity),
  };
}

/** Lower-pane intensity is the exact movement from the preceding displayed period, not a UI estimate. */
function withPeriodIntensity<T extends TrendPeriod>(periods: T[]): T[] {
  let previousValue: number | null = null;
  return periods.map((period) => {
    const value = periodValue(period);
    const intensity = previousValue === null ? 0 : Math.abs(value - previousValue);
    previousValue = value;
    return { ...period, intensity } as T;
  });
}

/** 命势中轴 uses a causal five-period mean, so it never reads future evidence. */
function indicatorsOf(periods: TrendPeriod[]): TrendIndicators {
  const values = periods.map(periodValue);
  return {
    trendCenterWindow: TREND_CENTER_WINDOW,
    trendCenter: values.map((_, index) => {
      const window = values.slice(Math.max(0, index - TREND_CENTER_WINDOW + 1), index + 1);
      return Math.round((window.reduce((sum, value) => sum + value, 0) / window.length) * 10) / 10;
    }),
    intensity: periods.map((period) => period.intensity),
  };
}

function periodValue(period: TrendPeriod): number {
  return period.kind === "point" ? period.value : period.close;
}

function capEvidence(hits: RuleHit[], cap = 24): RuleHit[] {
  const seen = new Set<string>();
  return hits.filter((hit) => {
    if (seen.has(hit.id) || seen.size >= cap) return false;
    seen.add(hit.id);
    return true;
  });
}
