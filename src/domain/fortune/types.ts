/** Trend-series contracts owned by src/domain/fortune. */
import type { BirthInput } from "../bazi/normalize";
import type { BoundaryNotice, LuckInfo, NatalChart, TimeCandidate } from "../bazi/types";

export const DIMENSION_KEYS = [
  "overall",
  "career",
  "wealth",
  "relationship",
  "children",
  "family",
  "health",
  "study",
] as const;

export type Dimension = (typeof DIMENSION_KEYS)[number];

export const DIMENSION_LABELS: Record<Dimension, string> = {
  overall: "综合",
  career: "事业",
  wealth: "财运",
  relationship: "感情",
  children: "子女",
  family: "家庭",
  health: "健康",
  study: "学业",
};

/** The seven scored facets; overall is derived as their rounded mean. */
export const SCORED_DIMENSIONS = [
  "career", "wealth", "relationship", "children", "family", "health", "study",
] as const;

export type ScoredDimension = (typeof SCORED_DIMENSIONS)[number];

export type DimensionScores = Record<Dimension, number>;

export type Resolution = "day" | "month" | "year";

export const RESOLUTION_LABELS: Record<Resolution, string> = {
  day: "日",
  month: "月",
  year: "年",
};

export interface TrendRange {
  start: string;
  end: string;
}

export interface TransitPillars {
  year: string;
  month: string;
  day: string;
  hour: string;
}

/** Smallest deterministic series point: one shichen of one civil day. */
export interface SeriesPoint {
  /** Civil wall clock of the shichen start, YYYY-MM-DDTHH:mm. */
  timestamp: string;
  scores: DimensionScores;
  factors: string[];
}

export interface Candle {
  /** ISO date of the aggregation unit: day, YYYY-MM, or YYYY. */
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  factors: string[];
  /** |close − open|, non-negative integer. */
  intensity: number;
}

export interface TrendSeries {
  resolution: Resolution;
  dimension: Dimension;
  range: TrendRange;
  candles: Candle[];
  /** The lower-level deterministic points each candle agrees with. */
  underlyingPoints: SeriesPoint[];
}

export interface ChartSnapshot {
  engineVersion: string;
  scoringProfileVersion: string;
  /** Hash of input, range, dimension, resolution, and both versions. */
  snapshotKey: string;
  input: BirthInput;
  civilCandidate: TimeCandidate;
  trueSolarCandidate: TimeCandidate;
  selectedStandard: "civil" | "trueSolar";
  natal: NatalChart;
  luck: LuckInfo;
  series: TrendSeries;
  boundary: BoundaryNotice | null;
}
