/**
 * ChartSnapshot assembly: the single composition point of the deterministic
 * engine. Both time-standard candidates are always computed; the selected
 * standard drives the natal chart, luck cycles, and the trend series.
 */
import { createHash } from "node:crypto";
import { calendarFactsOf } from "../bazi/calendar";
import { natalChartOf } from "../bazi/chart";
import type { BirthInput } from "../bazi/normalize";
import { dayOf, hourOf, solarCorrection, shiftLocalDateTime } from "../bazi/truesolar";
import { shichenIndexOfHour, SHICHEN_NAMES } from "../bazi/constants";
import { luckInfoOf } from "../bazi/luck";
import type { BoundaryNotice, TimeCandidate } from "../bazi/types";
import { ENGINE_VERSION } from "../version";
import { SCORING_PROFILE_VERSION } from "./profile";
import { buildTrendSeries } from "./series";
import type { ChartSnapshot, Dimension, Resolution, TrendRange } from "./types";

export interface BuildSnapshotArgs {
  input: BirthInput;
  range: TrendRange;
  dimension: Dimension;
  resolution: Resolution;
}

export function buildChartSnapshot(args: BuildSnapshotArgs): ChartSnapshot {
  const { input, range, dimension, resolution } = args;

  const correction = solarCorrection(input.timezone, input.longitude, input.localDateTime);
  const shifted = shiftLocalDateTime(input.localDateTime, correction.totalMinutes);

  const civilCandidate: TimeCandidate = {
    standard: "civil",
    localDateTime: input.localDateTime,
    shichen: SHICHEN_NAMES[shichenIndexOfHour(hourOf(input.localDateTime))],
    correctionMinutes: null,
    pillars: pillarsOf(input.localDateTime),
    calendar: calendarFactsOf(input.localDateTime),
  };
  const trueSolarCandidate: TimeCandidate = {
    standard: "trueSolar",
    localDateTime: shifted,
    shichen: SHICHEN_NAMES[shichenIndexOfHour(hourOf(shifted))],
    correctionMinutes: correction.totalMinutes,
    pillars: pillarsOf(shifted),
    calendar: calendarFactsOf(shifted),
  };

  const selectedDateTime =
    input.timeStandard === "trueSolar" ? shifted : input.localDateTime;
  const natal = natalChartOf(selectedDateTime);
  const luck = luckInfoOf(selectedDateTime, input.chartGender);
  const series = buildTrendSeries({ input, natal, range, dimension, resolution });

  const boundary: BoundaryNotice | null =
    dayOf(input.localDateTime) !== dayOf(shifted) ||
    civilCandidate.shichen !== trueSolarCandidate.shichen
      ? {
          changedDay: dayOf(input.localDateTime) !== dayOf(shifted),
          changedShichen: civilCandidate.shichen !== trueSolarCandidate.shichen,
          civilDay: dayOf(input.localDateTime),
          trueSolarDay: dayOf(shifted),
          civilShichen: civilCandidate.shichen,
          trueSolarShichen: trueSolarCandidate.shichen,
          correctionMinutes: correction.totalMinutes,
        }
      : null;

  const snapshotKey = computeSnapshotKey(input, range, dimension, resolution);
  return {
    engineVersion: ENGINE_VERSION,
    scoringProfileVersion: SCORING_PROFILE_VERSION,
    snapshotKey,
    input,
    civilCandidate,
    trueSolarCandidate,
    selectedStandard: input.timeStandard,
    natal,
    luck,
    series,
    boundary,
  };
}

function pillarsOf(localDateTime: string): string[] {
  return natalChartOf(localDateTime).pillars.map((pillar) => pillar.ganzhi);
}

function computeSnapshotKey(
  input: BirthInput,
  range: TrendRange,
  dimension: Dimension,
  resolution: Resolution,
): string {
  const canonical = JSON.stringify({
    input,
    range,
    dimension,
    resolution,
    engineVersion: ENGINE_VERSION,
    scoringProfileVersion: SCORING_PROFILE_VERSION,
  });
  return createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}
