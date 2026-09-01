/** Single composition point for the deterministic ZP-1 engine. */
import { createHash } from "node:crypto";
import { calendarFactsOfInstant } from "./calendar";
import { natalChartOf } from "./natal";
import { luckInfoOf } from "./luck";
import { natalRelationsOf } from "./relations";
import { verdictsOf } from "./verdict";
import { assessQi } from "./qi";
import { assessStructure } from "./structure";
import { resolveFavorable } from "./favorable";
import type { BirthInput } from "./normalize";
import { civilDateTimeOf, dayOf, hourOf, solarCorrection, shiftLocalDateTime } from "./astronomy";
import { shichenIndexOfHour, SHICHEN_NAMES } from "./constants";
import { buildTrendSeries } from "./projection";
import type { BoundaryNotice, ChartSnapshot, Dimension, Resolution, TimeCandidate, TrendRange } from "./contract";
import { ALGORITHM_VERSION } from "./version";

export function calculateBaziSnapshot(args: {
  input: BirthInput;
  range: TrendRange;
  dimension: Dimension;
  resolution: Resolution;
}): ChartSnapshot {
  const { input, range, dimension, resolution } = args;
  const civilDateTime = civilDateTimeOf(input.timezone, input.birthInstant);
  const correction = solarCorrection(input.timezone, input.longitude, input.birthInstant);
  const trueSolarDateTime = shiftLocalDateTime(civilDateTime, correction.totalMinutes);
  const civilCandidate = candidateOf("civil", civilDateTime, null, input.birthInstant);
  const trueSolarCandidate = candidateOf("trueSolar", trueSolarDateTime, correction.totalMinutes, input.birthInstant);
  const selectedDateTime = input.timeStandard === "trueSolar" ? trueSolarDateTime : civilDateTime;
  const natal = natalChartOf(selectedDateTime, input.birthInstant);
  const relations = natalRelationsOf(natal);
  const qi = assessQi(natal, relations);
  const judgment = resolveFavorable(natal, qi, assessStructure(natal, qi, relations), relations);
  const verdicts = verdictsOf({ input, natal, judgment, evidence: judgment.evidence });
  const luck = luckInfoOf(input.birthInstant, input.timezone, input.chartGender);
  const series = buildTrendSeries({ input, natal, judgment, luck, range, dimension, resolution });
  const boundary = boundaryOf(civilDateTime, trueSolarDateTime, civilCandidate, trueSolarCandidate, correction.totalMinutes);
  return {
    algorithmVersion: ALGORITHM_VERSION,
    snapshotKey: snapshotKey(input, range, dimension, resolution),
    input,
    civilCandidate,
    trueSolarCandidate,
    selectedStandard: input.timeStandard,
    natal,
    qi,
    judgment,
    relations,
    luck,
    verdicts,
    series,
    boundary,
  };
}

function candidateOf(standard: TimeCandidate["standard"], localDateTime: string, correctionMinutes: number | null, birthInstant: string): TimeCandidate {
  return {
    standard,
    localDateTime,
    shichen: SHICHEN_NAMES[shichenIndexOfHour(hourOf(localDateTime))],
    correctionMinutes,
    pillars: natalChartOf(localDateTime, birthInstant).pillars.map((pillar) => pillar.ganzhi),
    calendar: calendarFactsOfInstant(birthInstant),
  };
}

function boundaryOf(
  civil: string,
  solar: string,
  civilCandidate: TimeCandidate,
  trueSolarCandidate: TimeCandidate,
  correctionMinutes: number,
): BoundaryNotice | null {
  const changedDay = dayOf(civil) !== dayOf(solar);
  const changedShichen = civilCandidate.shichen !== trueSolarCandidate.shichen;
  return changedDay || changedShichen
    ? {
        changedDay,
        changedShichen,
        civilDay: dayOf(civil),
        trueSolarDay: dayOf(solar),
        civilShichen: civilCandidate.shichen,
        trueSolarShichen: trueSolarCandidate.shichen,
        correctionMinutes,
      }
    : null;
}

function snapshotKey(input: BirthInput, range: TrendRange, dimension: Dimension, resolution: Resolution): string {
  const { subjectName: _subjectName, birthplace: _birthplace, latitude: _latitude, ...calculationInput } = input;
  return createHash("sha256")
    .update(JSON.stringify({ input: calculationInput, range, dimension, resolution, algorithmVersion: ALGORITHM_VERSION }))
    .digest("hex")
    .slice(0, 16);
}
