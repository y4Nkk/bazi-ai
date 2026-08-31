/**
 * ScoringProfileV1 — the initial documented rubric for 传统命理趋势指数
 * (0–100, cultural-entertainment scale, not a probability or price).
 *
 * Rubric:
 *   1. Each of the seven facets starts from BASE 60.
 *   2. Natal modifiers: ten-god presence from the natal chart shifts each
 *      facet once (see NATAL_MODIFIERS); health also loses 2 points per
 *      natal branch 刑/冲 pair. Modifiers are presence-based, not counted.
 *   3. Transit modifiers at every series point: ganzhi relation weights from
 *      the FACTOR_CATALOG apply to all facets; in addition each facet has a
 *      target element (dimension star) scored against the eight transit
 *      stem/branch elements: same +2, generating +1, controlling −2,
 *      controlled −1, capped at ±10 per facet.
 *   4. overall = round(mean of the seven facets).
 *   5. Facet scores are clamped to [MIN_SCORE, MAX_SCORE] after modifiers.
 *
 * Any change to this rubric increments SCORING_PROFILE_VERSION.
 */
import {
  BRANCH_ELEMENTS,
  STEM_ELEMENTS,
  controls,
  generates,
  type Element,
} from "../bazi/constants";
import type { ChartGender, NatalChart } from "../bazi/types";
import { natalBranchConflictCount, transitFactorHits } from "./factors";
import {
  SCORED_DIMENSIONS,
  type Dimension,
  type DimensionScores,
  type ScoredDimension,
  type TransitPillars,
} from "./types";

export const SCORING_PROFILE_VERSION = "scoring-v1";

export const BASE_SCORE = 60;
export const MIN_SCORE = 5;
export const MAX_SCORE = 95;
const AFFINITY_CAP = 10;

/** Natal ten-god modifiers per facet; each entry applies once when present. */
const NATAL_MODIFIERS: Record<ScoredDimension, Array<[string, number]>> = {
  career: [["正官", 3], ["七杀", 2], ["正印", 2], ["伤官", -2]],
  wealth: [["正财", 3], ["偏财", 2]],
  relationship: [], // gender-dependent, see below
  children: [["食神", 3], ["伤官", 2]],
  family: [["正印", 3], ["偏印", 1], ["比肩", 1]],
  health: [], // conflict-count based, see below
  study: [["正印", 3], ["偏印", 1], ["食神", 1]],
};

function relationshipModifiers(gender: ChartGender): Array<[string, number]> {
  // 男看财星，女看官星 (traditional chart-gender convention).
  return gender === "male"
    ? [["正财", 3], ["偏财", 1]]
    : [["正官", 3], ["七杀", 1]];
}

/**
 * The element of each facet's dimension star, derived from the day master.
 * 官杀=克我者，财星=我克者，食伤=我生者，印星=生我者，健康=日主本身。
 */
export function dimensionTargetElement(
  dimension: Dimension,
  gender: ChartGender,
  dayMasterElement: Element,
): Element | null {
  const dm = dayMasterElement;
  switch (dimension) {
    case "career":
      return controlsInto(dm);
    case "wealth":
      return controlledBy(dm);
    case "relationship":
      return gender === "male" ? controlledBy(dm) : controlsInto(dm);
    case "children":
      return generatesInto(dm);
    case "family":
    case "study":
      return generatesOutOf(dm);
    case "health":
      return dm;
    default:
      return null;
  }
}

function counterpart(matches: (candidate: Element) => boolean): Element {
  const all: Element[] = ["木", "火", "土", "金", "水"];
  return all.find(matches) ?? all[0];
}
function controlsInto(dm: Element): Element {
  return counterpart((candidate) => controls(candidate, dm));
}
function controlledBy(dm: Element): Element {
  return counterpart((candidate) => controls(dm, candidate));
}
function generatesInto(dm: Element): Element {
  return counterpart((candidate) => generates(candidate, dm));
}
function generatesOutOf(dm: Element): Element {
  return counterpart((candidate) => generates(dm, candidate));
}

export function natalBaseline(natal: NatalChart, gender: ChartGender): DimensionScores {
  const counts = natal.tenGodCounts;
  const scores = {} as DimensionScores;
  for (const dimension of SCORED_DIMENSIONS) {
    let score = BASE_SCORE;
    const modifiers =
      dimension === "relationship"
        ? relationshipModifiers(gender)
        : NATAL_MODIFIERS[dimension];
    for (const [tenGod, delta] of modifiers) {
      if ((counts[tenGod] ?? 0) > 0) score += delta;
    }
    if (dimension === "health") {
      score -= natalBranchConflictCount(natal) * 2;
    }
    scores[dimension] = clamp(Math.round(score));
  }
  scores.overall = deriveOverall(scores);
  return scores;
}

export interface ScoredPoint {
  scores: DimensionScores;
  /** Deduplicated reason codes in first-occurrence order. */
  factors: string[];
}

export function scoreTransitPoint(
  baseline: DimensionScores,
  natal: NatalChart,
  gender: ChartGender,
  transit: TransitPillars,
): ScoredPoint {
  const hits = transitFactorHits(transit, natal);
  const sharedWeight = hits.reduce((sum, hit) => sum + hit.weight, 0);

  const transitElements: Element[] = [];
  for (const pillarGZ of [transit.year, transit.month, transit.day, transit.hour]) {
    transitElements.push(
      STEM_ELEMENTS[pillarGZ[0] as keyof typeof STEM_ELEMENTS],
      BRANCH_ELEMENTS[pillarGZ[1] as keyof typeof BRANCH_ELEMENTS],
    );
  }

  const scores = {} as DimensionScores;
  for (const dimension of SCORED_DIMENSIONS) {
    const target = dimensionTargetElement(dimension, gender, natal.dayMaster.element);
    let affinity = 0;
    if (target) {
      for (const element of transitElements) {
        if (element === target) affinity += 2;
        else if (generates(element, target)) affinity += 1;
        else if (controls(element, target)) affinity -= 2;
        else if (controls(target, element)) affinity -= 1;
      }
    }
    affinity = Math.max(-AFFINITY_CAP, Math.min(AFFINITY_CAP, affinity));
    scores[dimension] = clamp(baseline[dimension] + sharedWeight + affinity);
  }
  scores.overall = deriveOverall(scores);

  const factors: string[] = [];
  const seen = new Set<string>();
  for (const hit of hits) {
    if (!seen.has(hit.code)) {
      seen.add(hit.code);
      factors.push(hit.code);
    }
  }
  return { scores, factors };
}

export function deriveOverall(scores: DimensionScores): number {
  const sum = SCORED_DIMENSIONS.reduce((total, d) => total + scores[d], 0);
  return clamp(Math.round(sum / SCORED_DIMENSIONS.length));
}

function clamp(value: number): number {
  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, Math.round(value)));
}
