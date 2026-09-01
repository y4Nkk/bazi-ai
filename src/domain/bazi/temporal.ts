/** Temporal facts and period evidence; this module never creates chart scores. */
import { addDays, buildSegmentTable, dayPillarFor, hourPillarFor, monthYearPillarsFor, type SegmentTable } from "./calendar";
import { BRANCH_ELEMENTS, STEM_ELEMENTS, shichenIndexOfHour, type EarthlyBranch, type Element, type HeavenlyStem } from "./constants";
import type { BirthInput } from "./normalize";
import { dayOf, instantMillisOf } from "./astronomy";
import { capReasons, ruleHit } from "./rules";
import { ruleHitsFromRelations, temporalRelationsOf } from "./relations";
import { verdictsOf } from "./verdict";
import type { ChartSnapshot, NatalChart, NatalJudgment, RuleHit, SeriesPoint, TransitPillars } from "./contract";

export const TEMPORAL_LAYER_WEIGHT = { 大运: 8, 流年: 5, 流月: 3, 流日: 2, 流时: 1 } as const;

export interface TemporalJudgment {
  transit: TransitPillars;
  evidence: RuleHit[];
  verdicts: SeriesPoint["verdicts"];
}

export function temporalElements(transit: TransitPillars): Array<{ layer: keyof typeof TEMPORAL_LAYER_WEIGHT; element: Element }> {
  const entries: Array<[keyof typeof TEMPORAL_LAYER_WEIGHT, string]> = [
    ["流年", transit.year], ["流月", transit.month], ["流日", transit.day], ["流时", transit.hour],
    ...(transit.luck ? [["大运", transit.luck] as [keyof typeof TEMPORAL_LAYER_WEIGHT, string]] : []),
  ];
  return entries.flatMap(([layer, ganzhi]) => [
    { layer, element: STEM_ELEMENTS[ganzhi[0] as HeavenlyStem] },
    { layer, element: BRANCH_ELEMENTS[ganzhi[1] as EarthlyBranch] },
  ]);
}

function activeLuckPillar(snapshot: Pick<ChartSnapshot, "luck">, evalInstant: string): string | null {
  const at = instantMillisOf(evalInstant);
  return snapshot.luck.cycles.find((cycle) => cycle.ganzhi && at >= instantMillisOf(cycle.startInstant) && at < instantMillisOf(cycle.endInstant))?.ganzhi ?? null;
}

export function transitPillarsAt(table: SegmentTable, evalWallClock: string, evalInstant: string, luck: ChartSnapshot["luck"]): TransitPillars {
  const { yearGZ, monthGZ } = monthYearPillarsFor(table, evalInstant);
  const evalDay = dayOf(evalWallClock);
  const dayGZ = dayPillarFor(evalDay);
  const hour = Number(evalWallClock.slice(11, 13));
  const index = shichenIndexOfHour(hour);
  const hourDay = hour >= 23 ? dayPillarFor(addDays(evalDay, 1)) : dayGZ;
  return { year: yearGZ, month: monthGZ, day: dayGZ, hour: hourPillarFor(hourDay, index), luck: activeLuckPillar({ luck }, evalInstant) };
}

/** Re-runs relations and favorable/adverse evidence at every temporal layer. */
export function assessTemporal(args: {
  input: BirthInput;
  natal: NatalChart;
  judgment: NatalJudgment;
  transit: TransitPillars;
}): TemporalJudgment {
  const { input, natal, judgment, transit } = args;
  const evidence = ruleHitsFromRelations(temporalRelationsOf(natal, transit));
  for (const { layer, element } of temporalElements(transit)) {
    const severity = TEMPORAL_LAYER_WEIGHT[layer] >= 5 ? 3 : TEMPORAL_LAYER_WEIGHT[layer] >= 2 ? 2 : 1;
    if (judgment.favorableElements.includes(element)) evidence.push(ruleHit("FAVOURABLE_ELEMENT", "support", severity, layer, [layer, element]));
    if (judgment.adverseElements.includes(element)) evidence.push(ruleHit("ADVERSE_ELEMENT", "pressure", severity, layer, [layer, element]));
  }
  // Every period retains the original chart's theme. The current layers can
  // then qualify or contradict it, but can never manufacture a strong claim
  // without a natal basis.
  const allEvidence = uniqueEvidence([...evidence, ...judgment.evidence]);
  return {
    transit,
    evidence: allEvidence,
    verdicts: verdictsOf({ input, natal, judgment, evidence: allEvidence }),
  };
}

function uniqueEvidence(evidence: RuleHit[]): RuleHit[] {
  const seen = new Set<string>();
  return evidence.filter((hit) => {
    const key = `${hit.code}|${hit.temporalLayer}|${hit.subjects.join("|")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Candle and AI evidence is capped, but retains one auditable fact per active layer first. */
export function selectSeriesEvidence(evidence: RuleHit[]): RuleHit[] {
  const layers = ["原局", "大运", "流年", "流月", "流日", "流时"] as const;
  const representatives = layers.flatMap((layer) => evidence.find((hit) => hit.temporalLayer === layer) ?? []);
  return capReasons([...representatives, ...evidence]);
}

export function segmentTableFor(range: { start: string; end: string }): SegmentTable {
  return buildSegmentTable(range.start, range.end);
}
