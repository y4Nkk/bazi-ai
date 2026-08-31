/**
 * Deterministic reason codes for relations between transit pillars and the
 * natal chart. Codes are stable identifiers; the UI maps the prefix to a
 * Chinese label. Weights belong to ScoringProfileV1 in profile.ts.
 */
import {
  BRANCH_ELEMENTS,
  STEM_ELEMENTS,
  controls,
  generates,
  type EarthlyBranch,
  type Element,
} from "../bazi/constants";
import type { NatalChart } from "../bazi/types";
import type { TransitPillars } from "./types";

/** branch → its 六冲 partner */
const CHONG: Partial<Record<EarthlyBranch, EarthlyBranch>> = {
  子: "午", 午: "子", 丑: "未", 未: "丑", 寅: "申", 申: "寅",
  卯: "酉", 酉: "卯", 辰: "戌", 戌: "辰", 巳: "亥", 亥: "巳",
};

/** branch → its 六合 partner */
const LIUHE: Partial<Record<EarthlyBranch, EarthlyBranch>> = {
  子: "丑", 丑: "子", 寅: "亥", 亥: "寅", 卯: "戌", 戌: "卯",
  辰: "酉", 酉: "辰", 巳: "申", 申: "巳", 午: "未", 未: "午",
};

/** branch → its 六害 partner */
const HAI: Partial<Record<EarthlyBranch, EarthlyBranch>> = {
  子: "未", 未: "子", 丑: "午", 午: "丑", 寅: "巳", 巳: "寅",
  卯: "辰", 辰: "卯", 申: "亥", 亥: "申", 酉: "戌", 戌: "酉",
};

/** 相刑 unordered pairs, including self-punishment pairs */
const XING_PAIRS = new Set([
  "寅巳", "巳申", "申寅", "丑戌", "戌未", "未丑", "子卯", "卯子",
  "辰辰", "午午", "酉酉", "亥亥",
]);

const SANHE_GROUPS: EarthlyBranch[][] = [
  ["寅", "午", "戌"],
  ["巳", "酉", "丑"],
  ["申", "子", "辰"],
  ["亥", "卯", "未"],
];

/** 五合 stem pairs, order-insensitive */
const GAN_WUHE_PAIRS = new Set(["甲己", "己甲", "乙庚", "庚乙", "丙辛", "辛丙", "丁壬", "壬丁", "戊癸", "癸戊"]);

/** 天干相冲 pairs */
const GAN_CHONG_PAIRS = new Set(["甲庚", "庚甲", "乙辛", "辛乙", "丙壬", "壬丙", "丁癸", "癸丁"]);

export interface FactorHit {
  code: string;
  weight: number;
}

export interface FactorCatalogEntry {
  label: string;
  polarity: "beneficial" | "challenge";
  weight: number;
}

/** The single reason-code catalog of ScoringProfileV1. */
export const FACTOR_CATALOG: Record<string, FactorCatalogEntry> = {
  ZHI_CHONG: { label: "地支相冲", polarity: "challenge", weight: -5 },
  ZHI_XING: { label: "地支相刑", polarity: "challenge", weight: -4 },
  ZHI_HAI: { label: "地支相害", polarity: "challenge", weight: -3 },
  ZHI_LIUHE: { label: "地支六合", polarity: "beneficial", weight: 3 },
  ZHI_SANHE: { label: "地支三合", polarity: "beneficial", weight: 4 },
  GAN_WUHE: { label: "天干五合", polarity: "beneficial", weight: 2 },
  GAN_CHONG: { label: "天干相冲", polarity: "challenge", weight: -4 },
  KE_DM: { label: "克日主", polarity: "challenge", weight: -3 },
  SHENG_DM: { label: "生日主", polarity: "beneficial", weight: 2 },
  BIJIAN: { label: "比劫帮身", polarity: "beneficial", weight: 1 },
};

export function factorLabel(code: string): string {
  const prefix = code.split(":")[0];
  const entry = FACTOR_CATALOG[prefix];
  if (!entry) return code;
  const detail = code.includes(":") ? `(${code.slice(code.indexOf(":") + 1)})` : "";
  return `${entry.label}${detail}`;
}

/** Transit pillars evaluated against the natal chart; returns weighted hits. */
export function transitFactorHits(
  transit: TransitPillars,
  natal: NatalChart,
): FactorHit[] {
  const hits: FactorHit[] = [];
  const natalBranches = natal.pillars.map((p) => p.branch);
  const natalStems = natal.pillars.map((p) => p.stem);
  const dmStem = natal.dayMaster.stem;
  const dmElement = natal.dayMaster.element;
  const seenPairs = new Set<string>();
  const seenSanhe = new Set<string>();

  for (const pillarGZ of [transit.year, transit.month, transit.day, transit.hour]) {
    const branch = pillarGZ[1] as EarthlyBranch;
    for (const natalBranch of natalBranches) {
      pushPair(hits, seenPairs, "ZHI_CHONG", branch, CHONG[branch] === natalBranch ? natalBranch : null);
      pushPair(hits, seenPairs, "ZHI_LIUHE", branch, LIUHE[branch] === natalBranch ? natalBranch : null);
      pushPair(hits, seenPairs, "ZHI_HAI", branch, HAI[branch] === natalBranch ? natalBranch : null);
      if (XING_PAIRS.has(branch + natalBranch)) {
        pushPair(hits, seenPairs, "ZHI_XING", branch, natalBranch);
      }
    }
    for (const group of SANHE_GROUPS) {
      if (!group.includes(branch)) continue;
      const others = group.filter((b) => b !== branch);
      if (natalBranches.includes(others[0]) && natalBranches.includes(others[1])) {
        const code = `ZHI_SANHE:${group.join("")}`;
        if (!seenSanhe.has(code)) {
          seenSanhe.add(code);
          pushCode(hits, code, FACTOR_CATALOG.ZHI_SANHE.weight);
        }
      }
    }
  }

  for (const pillarGZ of [transit.year, transit.month, transit.day, transit.hour]) {
    const stem = pillarGZ[0];
    if (GAN_WUHE_PAIRS.has(stem + dmStem)) {
      pushCode(hits, `GAN_WUHE:${stem}${dmStem}`, FACTOR_CATALOG.GAN_WUHE.weight);
    }
    if (GAN_CHONG_PAIRS.has(stem + dmStem)) {
      pushCode(hits, `GAN_CHONG:${stem}${dmStem}`, FACTOR_CATALOG.GAN_CHONG.weight);
    }
  }

  for (const pillarGZ of [transit.year, transit.month, transit.day, transit.hour]) {
    const units: Element[] = [
      STEM_ELEMENTS[pillarGZ[0] as keyof typeof STEM_ELEMENTS],
      BRANCH_ELEMENTS[pillarGZ[1] as EarthlyBranch],
    ];
    for (const element of units) {
      if (element === dmElement) pushCode(hits, "BIJIAN", FACTOR_CATALOG.BIJIAN.weight);
      else if (generates(element, dmElement)) pushCode(hits, `SHENG_DM:${element}生${dmElement}`, FACTOR_CATALOG.SHENG_DM.weight);
      else if (controls(element, dmElement)) pushCode(hits, `KE_DM:${element}克${dmElement}`, FACTOR_CATALOG.KE_DM.weight);
    }
  }

  return hits;
  function pushPair(
    list: FactorHit[],
    seen: Set<string>,
    code: string,
    branch: string,
    matched: string | null,
  ): void {
    if (matched === null) return;
    const full = `${code}:${branch}${matched}`;
    if (seen.has(full)) return;
    seen.add(full);
    pushCode(list, full, FACTOR_CATALOG[code].weight);
  }
  function pushCode(list: FactorHit[], code: string, weight: number): void {
    list.push({ code, weight });
  }
}

/** 刑/冲 pairs among the natal branches themselves (used by the health baseline). */
export function natalBranchConflictCount(natal: NatalChart): number {
  const branches = natal.pillars.map((p) => p.branch);
  let count = 0;
  for (let i = 0; i < branches.length; i += 1) {
    for (let j = i + 1; j < branches.length; j += 1) {
      const pair = branches[i] + branches[j];
      if (CHONG[branches[i] as EarthlyBranch] === branches[j] || XING_PAIRS.has(pair)) count += 1;
    }
  }
  return count;
}
