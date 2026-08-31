/** Shared BaZi vocabulary used by calendar facts, charts, and factors. */

export const HEAVENLY_STEMS = [
  "甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸",
] as const;

export const EARTHLY_BRANCHES = [
  "子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥",
] as const;

export type HeavenlyStem = (typeof HEAVENLY_STEMS)[number];
export type EarthlyBranch = (typeof EARTHLY_BRANCHES)[number];

export const STEM_ELEMENTS: Record<HeavenlyStem, Element> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
  己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};

/** Element order follows the generating cycle 木→火→土→金→水→木. */
export const ELEMENTS = ["木", "火", "土", "金", "水"] as const;
export type Element = (typeof ELEMENTS)[number];

export const BRANCH_ELEMENTS: Record<EarthlyBranch, Element> = {
  子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火",
  午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水",
};

/** 子 at 23:00–00:59, then every two hours. */
export const SHICHEN_NAMES = [
  "子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥",
] as const;

export function shichenIndexOfHour(hour: number): number {
  return Math.floor(((hour + 1) % 24) / 2);
}

export function stemIndexOf(stem: string): number {
  return HEAVENLY_STEMS.indexOf(stem as HeavenlyStem);
}

export function branchIndexOf(branch: string): number {
  return EARTHLY_BRANCHES.indexOf(branch as EarthlyBranch);
}

/** Element that generates the given element (木生火…). */
export function generatingElementOf(target: Element): Element {
  return ELEMENTS[(ELEMENTS.indexOf(target) + 4) % 5];
}

/** Element that controls the given element (木克土…). */
export function controllingElementOf(target: Element): Element {
  return ELEMENTS[(ELEMENTS.indexOf(target) + 3) % 5];
}

/** True when `source` generates `target` (相生). */
export function generates(source: Element, target: Element): boolean {
  return generatingElementOf(target) === source;
}

/** True when `source` controls `target` (相克). */
export function controls(source: Element, target: Element): boolean {
  return controllingElementOf(target) === source;
}
