/** Domain types owned by src/domain/bazi. BirthInput itself is owned by normalize.ts. */
import type { Element } from "./constants";

export type ChartGender = "male" | "female";
export type TimeStandard = "civil" | "trueSolar";
export type PillarName = "year" | "month" | "day" | "hour";

export interface PillarFact {
  name: PillarName;
  ganzhi: string;
  stem: string;
  branch: string;
  stemElement: Element;
  branchElement: Element;
  /** 十神 of the pillar stem against the day master; the day pillar itself is 日主. */
  stemTenGod: string;
  hiddenStems: string[];
  hiddenTenGods: string[];
}

export interface CalendarFacts {
  lunarYearInChinese: string;
  lunarMonthLabel: string;
  lunarDayInChinese: string;
  animal: string;
  prevJieQi: { name: string; solar: string };
  nextJieQi: { name: string; solar: string };
}

/** A wall-clock reading of the birth moment under one time standard. */
export interface TimeCandidate {
  standard: TimeStandard;
  /** Evaluated local wall clock (trueSolar is already corrected). */
  localDateTime: string;
  shichen: string;
  /** Minutes added for true solar time; omitted for civil. */
  correctionMinutes: number | null;
  pillars: string[];
  calendar: CalendarFacts;
}

export interface NatalChart {
  pillars: PillarFact[];
  dayMaster: { stem: string; element: Element };
  /** Stems plus branch main qi, eight units total. */
  elementCounts: Record<Element, number>;
  /** Ten-god name → occurrences across pillar stems and hidden stems (day stem excluded). */
  tenGodCounts: Record<string, number>;
}

export interface LuckCycle {
  index: number;
  /** Empty before the first cycle starts. */
  ganzhi: string | null;
  startYear: number;
  endYear: number;
  startAge: number;
  endAge: number;
}

export interface LuckInfo {
  forward: boolean;
  directionLabel: "顺行" | "逆行";
  startDateTime: string;
  startAgeLabel: string;
  cycles: LuckCycle[];
}

/** Raised when the true-solar correction moves the day or the shichen. */
export interface BoundaryNotice {
  changedDay: boolean;
  changedShichen: boolean;
  civilDay: string;
  trueSolarDay: string;
  civilShichen: string;
  trueSolarShichen: string;
  correctionMinutes: number;
}
