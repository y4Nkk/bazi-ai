/** K-line projection and OHLC aggregation; temporal judgment stays in temporal.ts. */
import { enumerateDays } from "./calendar";
import { instantCandidatesForCivil, solarCorrection, shiftLocalDateTime } from "./astronomy";
import { DIMENSION_KEYS, type Candle, type ChartSnapshot, type Dimension, type DimensionScores, type NatalChart, type NatalJudgment, type Resolution, type RuleHit, type SeriesPoint, type TransitPillars, type TrendRange, type TrendSeries } from "./contract";
import { assessTemporal, segmentTableFor, TEMPORAL_LAYER_WEIGHT, transitPillarsAt } from "./temporal";

const SHICHEN_START_HOURS = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];

export const RANGE_LIMITS: Record<Resolution, { maxDays: number; label: string }> = {
  day: { maxDays: 62, label: "日视图最多 62 天" },
  month: { maxDays: 732, label: "月视图最多 24 个月" },
  year: { maxDays: 4400, label: "年视图最多 12 年" },
};

export class RangeTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RangeTooLargeError";
  }
}

function projectScore(support: number, pressure: number): number {
  const net = (support - pressure) / (support + pressure + 1);
  return Math.max(5, Math.min(95, Math.round(50 + 45 * net)));
}

function weightedEvidence(evidence: RuleHit[]): { support: number; pressure: number } {
  return evidence.reduce((total, hit) => {
    const weight = hit.temporalLayer === "原局" ? 1 : TEMPORAL_LAYER_WEIGHT[hit.temporalLayer];
    if (hit.direction > 0) total.support += hit.severity * weight;
    if (hit.direction < 0) total.pressure += hit.severity * weight;
    return total;
  }, { support: 0, pressure: 0 });
}

/** Projects deterministic verdict evidence to a bounded culture-and-entertainment index. */
export function projectTemporal(transit: ReturnType<typeof assessTemporal>): { scores: DimensionScores; reasons: RuleHit[]; verdicts: SeriesPoint["verdicts"] } {
  const scores = {} as DimensionScores;
  for (const dimension of DIMENSION_KEYS) {
    const verdict = transit.verdicts[dimension];
    const evidence = dimension === "overall"
      ? transit.evidence
      : [...verdict.evidenceFor, ...verdict.evidenceAgainst];
    const { support, pressure } = weightedEvidence(evidence);
    scores[dimension] = projectScore(support, pressure);
  }
  return { scores, reasons: transit.evidence, verdicts: transit.verdicts };
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
  const limit = RANGE_LIMITS[resolution];
  if (days.length === 0 || days.length > limit.maxDays) throw new RangeTooLargeError(limit.label);
  const table = segmentTableFor(range);
  const shichenPoints: SeriesPoint[] = [];
  const dailyEndPoints: SeriesPoint[] = [];
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
        return { timestamp, scores: projected.scores, reasons: projected.reasons, verdicts: projected.verdicts };
      });
    });
    if (points.length === 0) continue;
    shichenPoints.push(...points);
    dailyEndPoints.push(points.at(-1)!);
    dailyCandles.push(aggregateCandle(day, points.map((point) => point.scores[dimension]), points));
  }
  if (dailyCandles.length === 0) throw new RangeTooLargeError("所选区间不含可计算的民用时刻");
  return aggregateUp(resolution, dailyCandles, shichenPoints, dailyEndPoints, dimension, range);
}

function aggregateCandle(timestamp: string, values: number[], points: SeriesPoint[]): Candle {
  return {
    timestamp,
    open: values[0],
    close: values[values.length - 1],
    high: Math.max(...values),
    low: Math.min(...values),
    reasons: capEvidence(points.flatMap((point) => point.reasons)),
    intensity: Math.abs(values[values.length - 1] - values[0]),
  };
}

function aggregateUp(resolution: Resolution, dailyCandles: Candle[], points: SeriesPoint[], dailyEndPoints: SeriesPoint[], dimension: Dimension, range: TrendRange): TrendSeries {
  if (resolution === "day") return { resolution, dimension, range, candles: dailyCandles, underlyingPoints: points };
  const monthCandles = groupCandles(dailyCandles, (candle) => candle.timestamp.slice(0, 7));
  if (resolution === "month") return { resolution, dimension, range, candles: monthCandles, underlyingPoints: dailyEndPoints };
  const lastPointByMonth = new Map<string, SeriesPoint>();
  dailyEndPoints.forEach((point) => lastPointByMonth.set(point.timestamp.slice(0, 7), point));
  const yearCandles = groupCandles(monthCandles, (candle) => candle.timestamp.slice(0, 4));
  return { resolution, dimension, range, candles: yearCandles, underlyingPoints: monthCandles.map((candle) => lastPointByMonth.get(candle.timestamp) as SeriesPoint) };
}

function groupCandles(candles: Candle[], keyOf: (candle: Candle) => string): Candle[] {
  const groups = new Map<string, Candle[]>();
  for (const candle of candles) groups.set(keyOf(candle), [...(groups.get(keyOf(candle)) ?? []), candle]);
  return [...groups.entries()].map(([timestamp, bucket]) => ({
    timestamp,
    open: bucket[0].open,
    close: bucket[bucket.length - 1].close,
    high: Math.max(...bucket.map((candle) => candle.high)),
    low: Math.min(...bucket.map((candle) => candle.low)),
    reasons: capEvidence(bucket.flatMap((candle) => candle.reasons)),
    intensity: Math.abs(bucket[bucket.length - 1].close - bucket[0].open),
  }));
}

function capEvidence(hits: RuleHit[], cap = 24): RuleHit[] {
  const seen = new Set<string>();
  return hits.filter((hit) => {
    if (seen.has(hit.id) || seen.size >= cap) return false;
    seen.add(hit.id);
    return true;
  });
}
