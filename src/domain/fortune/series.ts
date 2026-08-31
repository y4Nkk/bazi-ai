/**
 * Timeline generation and candle aggregation.
 *
 * The smallest point is one shichen. For every civil day in the range the
 * engine evaluates twelve shichen points at the civil start hours 23, 1, 3,
 * …, 21. Under the trueSolar standard each evaluation clock is first shifted
 * by that day's correction (equation of time + longitude), so day and shichen
 * boundaries follow apparent solar time. Daily candles aggregate twelve
 * shichen points; monthly candles aggregate daily candles; yearly candles
 * aggregate monthly candles. OHLC invariants hold by construction.
 */
import {
  addDays,
  buildSegmentTable,
  dayPillarFor,
  enumerateDays,
  hourPillarFor,
  monthYearPillarsFor,
  type SegmentTable,
} from "../bazi/calendar";
import { shichenIndexOfHour } from "../bazi/constants";
import type { BirthInput } from "../bazi/normalize";
import { dayOf, solarCorrection, shiftLocalDateTime } from "../bazi/truesolar";
import type { NatalChart } from "../bazi/types";
import { natalBaseline, scoreTransitPoint } from "./profile";
import {
  type Candle,
  type Dimension,
  type Resolution,
  type SeriesPoint,
  type TransitPillars,
  type TrendRange,
  type TrendSeries,
} from "./types";

/** Shichen start hours for one day: 子 23:00, 丑 01:00, …, 亥 21:00. */
const SHICHEN_START_HOURS = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];

const FACTOR_CAP = 24;

export interface RangeLimit {
  maxDays: number;
  label: string;
}

export const RANGE_LIMITS: Record<Resolution, RangeLimit> = {
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

export interface BuildSeriesArgs {
  input: BirthInput;
  natal: NatalChart;
  range: TrendRange;
  dimension: Dimension;
  resolution: Resolution;
}

export function buildTrendSeries(args: BuildSeriesArgs): TrendSeries {
  const { input, natal, range, dimension, resolution } = args;
  const days = enumerateDays(range.start, range.end);
  const limit = RANGE_LIMITS[resolution];
  if (days.length === 0 || days.length > limit.maxDays) {
    throw new RangeTooLargeError(limit.label);
  }

  const segmentTable = buildSegmentTable(range.start, range.end);
  const baseline = natalBaseline(natal, input.chartGender);

  const shichenPoints: SeriesPoint[] = [];
  const dailyCandles: Candle[] = [];

  for (const day of days) {
    const correctionMinutes =
      input.timeStandard === "trueSolar"
        ? solarCorrection(input.timezone, input.longitude, `${day}T12:00`).totalMinutes
        : 0;

    const dayPoints: SeriesPoint[] = [];
    for (let k = 0; k < 12; k += 1) {
      const civilDt = `${day}T${pad2(SHICHEN_START_HOURS[k])}:00`;
      const evalDt =
        correctionMinutes !== 0
          ? shiftLocalDateTime(civilDt, correctionMinutes)
          : civilDt;
      const transit = transitPillarsAt(segmentTable, evalDt);
      const scored = scoreTransitPoint(baseline, natal, input.chartGender, transit);
      dayPoints.push({ timestamp: civilDt, scores: scored.scores, factors: scored.factors });
    }
    shichenPoints.push(...dayPoints);
    dailyCandles.push(aggregateCandle(day, dayPoints.map((p) => p.scores[dimension]), dayPoints));
  }

  const { candles, underlyingPoints } = aggregateUp(resolution, days, dailyCandles, shichenPoints);
  return { resolution, dimension, range, candles, underlyingPoints };
}

function transitPillarsAt(table: SegmentTable, evalDateTime: string): TransitPillars {
  const { yearGZ, monthGZ } = monthYearPillarsFor(table, evalDateTime);
  const evalDay = dayOf(evalDateTime);
  const dayGZ = dayPillarFor(evalDay);
  const hour = Number(evalDateTime.slice(11, 13));
  const shichenIndex = shichenIndexOfHour(hour);
  // 晚子时 (23:xx) derives its hour stem from the next day's stem.
  const hourDayGZ = hour >= 23 ? dayPillarFor(addDays(evalDay, 1)) : dayGZ;
  return {
    year: yearGZ,
    month: monthGZ,
    day: dayGZ,
    hour: hourPillarFor(hourDayGZ, shichenIndex),
  };
}

/** open = first point, close = last point, high/low = extremes. */
function aggregateCandle(
  timestamp: string,
  values: number[],
  points: SeriesPoint[],
): Candle {
  const open = values[0];
  const close = values[values.length - 1];
  const high = Math.max(...values);
  const low = Math.min(...values);
  return {
    timestamp,
    open,
    high,
    low,
    close,
    factors: mergeFactors(points.map((p) => p.factors)),
    intensity: Math.abs(close - open),
  };
}

function aggregateUp(
  resolution: Resolution,
  days: string[],
  dailyCandles: Candle[],
  shichenPoints: SeriesPoint[],
): { candles: Candle[]; underlyingPoints: SeriesPoint[] } {
  if (resolution === "day") {
    return { candles: dailyCandles, underlyingPoints: shichenPoints };
  }

  const lastPointByMonth = new Map<string, SeriesPoint>();
  days.forEach((day, index) => {
    lastPointByMonth.set(day.slice(0, 7), shichenPoints[index * 12 + 11]);
  });

  const monthlyCandles = groupCandles(dailyCandles, (c) => c.timestamp.slice(0, 7));
  if (resolution === "month") {
    const dailyClosePoints = days.map((_, index) => shichenPoints[index * 12 + 11]);
    return { candles: monthlyCandles, underlyingPoints: dailyClosePoints };
  }

  const yearlyCandles = groupCandles(monthlyCandles, (c) => c.timestamp.slice(0, 4));
  const monthlyClosePoints = monthlyCandles.map(
    (candle) => lastPointByMonth.get(candle.timestamp) as SeriesPoint,
  );
  return { candles: yearlyCandles, underlyingPoints: monthlyClosePoints };
}

/** Aggregates sibling candles: open = first open, close = last close. */
function groupCandles(candles: Candle[], keyOf: (c: Candle) => string): Candle[] {
  const groups = new Map<string, Candle[]>();
  for (const candle of candles) {
    const key = keyOf(candle);
    const bucket = groups.get(key);
    if (bucket) bucket.push(candle);
    else groups.set(key, [candle]);
  }
  return [...groups.entries()].map(([timestamp, bucket]) => ({
    timestamp,
    open: bucket[0].open,
    close: bucket[bucket.length - 1].close,
    high: Math.max(...bucket.map((c) => c.high)),
    low: Math.min(...bucket.map((c) => c.low)),
    factors: mergeFactors(bucket.map((c) => c.factors)),
    intensity: Math.abs(bucket[bucket.length - 1].close - bucket[0].open),
  }));
}

function mergeFactors(factorLists: string[][]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const list of factorLists) {
    for (const code of list) {
      if (seen.has(code)) continue;
      seen.add(code);
      merged.push(code);
      if (merged.length >= FACTOR_CAP) return merged;
    }
  }
  return merged;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
