/**
 * ZP-1's only traditional-rule catalog. Calendar facts stay in calendar.ts;
 * every interpretive rule and its presentation label is owned here.
 */
import {
  BRANCH_ELEMENTS,
  branchIndexOf,
  EARTHLY_BRANCHES,
  ELEMENTS,
  STEM_ELEMENTS,
  controls,
  generates,
  type EarthlyBranch,
  type Element,
  type HeavenlyStem,
} from "./constants";
import { ganzhiIndexOf } from "./calendar";
import { DIMENSION_KEYS, type NatalChart, type RuleHit, type TemporalLayer, type TransitPillars } from "./contract";

export const HIDDEN_STEM_WEIGHTS: Record<EarthlyBranch, Array<[HeavenlyStem, number]>> = {
  子: [["癸", 10]],
  丑: [["己", 6], ["癸", 3], ["辛", 1]],
  寅: [["甲", 6], ["丙", 3], ["戊", 1]],
  卯: [["乙", 10]],
  辰: [["戊", 6], ["乙", 3], ["癸", 1]],
  巳: [["丙", 6], ["戊", 3], ["庚", 1]],
  午: [["丁", 7], ["己", 3]],
  未: [["己", 6], ["丁", 3], ["乙", 1]],
  申: [["庚", 6], ["壬", 3], ["戊", 1]],
  酉: [["辛", 10]],
  戌: [["戊", 6], ["辛", 3], ["丁", 1]],
  亥: [["壬", 7], ["甲", 3]],
};

/** Integer qi ledger constants; their only owner is this frozen catalog. */
export const QI_RULES = Object.freeze({
  exposedStem: { year: 8, month: 12, day: 8, hour: 8 },
  monthCommand: { early: 20, middle: 16, late: 12 },
  root: { main: 6, middle: 3, residual: 1, prosperous: 8 },
  rootDisruption: { blocked: 2, broken: 4, contested: 1 },
  strength: { weak: -10, strong: 10, extreme: 20 },
  specialDominancePermille: 650,
});

export const CHONG: Partial<Record<EarthlyBranch, EarthlyBranch>> = {
  子: "午", 午: "子", 丑: "未", 未: "丑", 寅: "申", 申: "寅",
  卯: "酉", 酉: "卯", 辰: "戌", 戌: "辰", 巳: "亥", 亥: "巳",
};
export const LIUHE: Partial<Record<EarthlyBranch, EarthlyBranch>> = {
  子: "丑", 丑: "子", 寅: "亥", 亥: "寅", 卯: "戌", 戌: "卯",
  辰: "酉", 酉: "辰", 巳: "申", 申: "巳", 午: "未", 未: "午",
};
export const HAI: Partial<Record<EarthlyBranch, EarthlyBranch>> = {
  子: "未", 未: "子", 丑: "午", 午: "丑", 寅: "巳", 巳: "寅",
  卯: "辰", 辰: "卯", 申: "亥", 亥: "申", 酉: "戌", 戌: "酉",
};
export const PO: Partial<Record<EarthlyBranch, EarthlyBranch>> = {
  子: "酉", 酉: "子", 丑: "辰", 辰: "丑", 寅: "亥", 亥: "寅",
  卯: "午", 午: "卯", 巳: "申", 申: "巳", 未: "戌", 戌: "未",
};
export const XING = new Set(["寅巳", "巳申", "申寅", "丑戌", "戌未", "未丑", "子卯", "卯子", "辰辰", "午午", "酉酉", "亥亥"]);
export const SANHE: EarthlyBranch[][] = [["寅", "午", "戌"], ["巳", "酉", "丑"], ["申", "子", "辰"], ["亥", "卯", "未"]];
export const SANHUI: EarthlyBranch[][] = [["寅", "卯", "辰"], ["巳", "午", "未"], ["申", "酉", "戌"], ["亥", "子", "丑"]];
export const GAN_WUHE = new Set(["甲己", "己甲", "乙庚", "庚乙", "丙辛", "辛丙", "丁壬", "壬丁", "戊癸", "癸戊"]);
export const GAN_CHONG = new Set(["甲庚", "庚甲", "乙辛", "辛乙", "丙壬", "壬丙", "丁癸", "癸丁"]);

/** 月令劫财仅在此支位时取羊刃格；其余仍为月劫。 */
export const YANG_REN_BRANCH: Record<HeavenlyStem, EarthlyBranch> = {
  甲: "卯", 乙: "寅", 丙: "午", 丁: "巳", 戊: "午",
  己: "巳", 庚: "酉", 辛: "申", 壬: "子", 癸: "亥",
};

/** Annotation-only shensha data. None of these entries participate in Qi, structure, favorable, or projection. */
export const SHENSHA = Object.freeze({
  tianYi: { 甲: "丑未", 戊: "丑未", 庚: "丑未", 乙: "子申", 己: "子申", 丙: "亥酉", 丁: "亥酉", 壬: "巳卯", 癸: "巳卯", 辛: "寅午" } as Record<HeavenlyStem, string>,
  wenChang: { 甲: "巳", 乙: "午", 丙: "申", 丁: "酉", 戊: "申", 己: "酉", 庚: "亥", 辛: "子", 壬: "寅", 癸: "卯" } as Record<HeavenlyStem, EarthlyBranch>,
  lu: { 甲: "寅", 乙: "卯", 丙: "巳", 丁: "午", 戊: "巳", 己: "午", 庚: "申", 辛: "酉", 壬: "亥", 癸: "子" } as Record<HeavenlyStem, EarthlyBranch>,
  yiMaGroups: [["寅午戌", "申"], ["申子辰", "寅"], ["巳酉丑", "亥"], ["亥卯未", "巳"]] as Array<[string, string]>,
  taoHuaGroups: [["寅午戌", "卯"], ["申子辰", "酉"], ["巳酉丑", "午"], ["亥卯未", "子"]] as Array<[string, string]>,
  huaGaiGroups: [["寅午戌", "戌"], ["申子辰", "辰"], ["巳酉丑", "丑"], ["亥卯未", "未"]] as Array<[string, string]>,
});

const RULE_LABELS: Record<string, string> = {
  ZHI_CHONG: "地支相冲",
  ZHI_XING: "地支相刑",
  ZHI_HAI: "地支相害",
  ZHI_PO: "地支相破",
  ZHI_LIUHE: "地支六合",
  ZHI_SANHE: "地支三合",
  ZHI_BANHE: "地支半合",
  ZHI_GONGHE: "地支拱合",
  ZHI_SANHUI: "地支三会",
  GAN_WUHE: "天干五合",
  GAN_CHONG: "天干相冲",
  GAN_SHENG: "天干相生",
  GAN_KE: "天干相克",
  SHENG_DM: "生日主",
  KE_DM: "克日主",
  BIJIAN: "比劫帮身",
  FAVOURABLE_ELEMENT: "喜用五行到位",
  ADVERSE_ELEMENT: "忌神五行显现",
  LUCK_SUPPORT: "大运扶助",
  LUCK_PRESSURE: "大运施压",
  QI_MONTH_COMMAND: "月令司令",
  QI_EXPOSED: "天干透出",
  QI_ROOT: "日主通根",
  QI_NO_ROOT: "日主无根",
  QI_ROOT_DISRUPTED: "日主根气受扰",
  STRUCTURE: "命局格局",
  CLIMATE: "调候所需",
  REMEDY: "通关救应",
  QI_FLOW: "五行流通",
  QI_CLIMATE: "寒暖燥湿",
  ROOT: "日主根气",
  STRUCTURE_RESCUE: "格局救应",
  STRUCTURE_IMPAIR: "格局受损",
  RELATION_BLOCKED: "关系受阻",
  RELATION_BROKEN: "关系被破",
  RELATION_CONTESTED: "关系争用",
  FUYIN: "伏吟",
  FANYIN: "反吟",
  TIANKEDICHONG: "天克地冲",
  SUIYUN_BINLIN: "岁运并临",
  INSUFFICIENT_EVIDENCE: "当前规则无法确定",
};

export function ruleLabel(code: string): string {
  const prefix = code.split(":")[0];
  const label = RULE_LABELS[prefix];
  if (!label) throw new Error(`规则目录缺少标签: ${code}`);
  return label;
}

export function ruleHit(
  code: string,
  polarity: RuleHit["polarity"],
  severity: RuleHit["severity"],
  temporalLayer: TemporalLayer,
  subjects: string[],
): RuleHit {
  return {
    id: `${code}|${temporalLayer}|${subjects.join("|")}`,
    code,
    label: ruleLabel(code),
    polarity,
    direction: polarity === "support" ? 1 : polarity === "pressure" ? -1 : 0,
    severity,
    temporalLayer,
    domainRelevance: ruleDomains(code),
    subjects,
  };
}

export function ruleDomains(code: string): typeof DIMENSION_KEYS[number][] {
  if (code.startsWith("QI_") || code.startsWith("CLIMATE") || code.startsWith("REMEDY")) return ["overall", "personality", "health"];
  if (code.startsWith("STRUCTURE")) return ["overall", "career", "wealth", "study"];
  if (code.startsWith("ZHI_CHONG") || code.startsWith("ZHI_XING") || code.startsWith("ZHI_HAI") || code.startsWith("ZHI_PO") || code.startsWith("FANYIN") || code.startsWith("TIANKEDICHONG")) return ["overall", "relationship", "family", "health", "mobility"];
  if (code.startsWith("ZHI_LIUHE") || code.startsWith("ZHI_SANHE") || code.startsWith("ZHI_BANHE") || code.startsWith("ZHI_GONGHE") || code.startsWith("ZHI_SANHUI")) return ["overall", "relationship", "family", "mobility"];
  return [...DIMENSION_KEYS];
}

/** 30 纳音 names in canonical 60-jiazi pair order. */
const NAYIN_BY_PAIR = [
  "海中金", "炉中火", "大林木", "路旁土", "剑锋金", "山头火", "涧下水", "城头土", "白蜡金", "杨柳木",
  "泉中水", "屋上土", "霹雳火", "松柏木", "长流水", "砂中金", "山下火", "平地木", "壁上土", "金箔金",
  "覆灯火", "天河水", "大驿土", "钗钏金", "桑柘木", "大溪水", "沙中土", "天上火", "石榴木", "大海水",
] as const;

const LIFE_STAGE_START: Record<HeavenlyStem, EarthlyBranch> = {
  甲: "亥", 乙: "午", 丙: "寅", 丁: "酉", 戊: "寅",
  己: "酉", 庚: "巳", 辛: "子", 壬: "申", 癸: "卯",
};
const LIFE_STAGES = ["长生", "沐浴", "冠带", "临官", "帝旺", "衰", "病", "死", "墓", "绝", "胎", "养"] as const;
const VOID_BY_XUN = ["戌亥", "申酉", "午未", "辰巳", "寅卯", "子丑"] as const;

/** Frozen data manifest. Any table or adjudication-order change changes ZP-1's public version. */
export const RULE_CATALOG_MANIFEST = Object.freeze({
  hiddenStems: HIDDEN_STEM_WEIGHTS,
  qi: QI_RULES,
  branchRelations: { CHONG, LIUHE, HAI, PO, XING: [...XING], SANHE, SANHUI },
  stemRelations: { GAN_WUHE: [...GAN_WUHE], GAN_CHONG: [...GAN_CHONG] },
  yangRen: YANG_REN_BRANCH,
  shensha: SHENSHA,
  ruleLabels: RULE_LABELS,
  nayin: NAYIN_BY_PAIR,
  lifeStages: { start: LIFE_STAGE_START, stages: LIFE_STAGES },
  void: VOID_BY_XUN,
});

/** Browser-safe FNV-1a fingerprint of the frozen catalog. */
export function ruleCatalogFingerprint(): string {
  let value = 0x811c9dc5;
  const source = JSON.stringify(RULE_CATALOG_MANIFEST);
  for (let index = 0; index < source.length; index += 1) {
    value ^= source.charCodeAt(index);
    value = Math.imul(value, 0x01000193);
  }
  return (value >>> 0).toString(16).padStart(8, "0");
}

export function hiddenStemRank(index: number): "main" | "middle" | "residual" {
  return index === 0 ? "main" : index === 1 ? "middle" : "residual";
}

export function nayinOf(ganzhi: string): string {
  return NAYIN_BY_PAIR[Math.floor(ganzhiIndexOf(ganzhi) / 2)];
}

export function voidBranchesOf(dayGanzhi: string): string[] {
  return [...VOID_BY_XUN[Math.floor(ganzhiIndexOf(dayGanzhi) / 10)]];
}

export function lifeStageOf(dayMaster: string, branch: string): string {
  const start = branchIndexOf(LIFE_STAGE_START[dayMaster as HeavenlyStem]);
  const at = branchIndexOf(branch);
  const forward = stemYinYang(dayMaster) === "yang";
  return LIFE_STAGES[((forward ? at - start : start - at) + 12) % 12];
}

export function stemYinYang(stem: string): "yang" | "yin" {
  return ["甲", "丙", "戊", "庚", "壬"].includes(stem) ? "yang" : "yin";
}

/** 十神 relation of candidate stem to the day master. */
export function tenGodOf(dayMaster: string, candidate: string): string {
  if (candidate === dayMaster) return "日主";
  const dayElement = STEM_ELEMENTS[dayMaster as HeavenlyStem];
  const candidateElement = STEM_ELEMENTS[candidate as HeavenlyStem];
  const samePolarity = stemYinYang(dayMaster) === stemYinYang(candidate);
  if (candidateElement === dayElement) return samePolarity ? "比肩" : "劫财";
  if (generates(dayElement, candidateElement)) return samePolarity ? "食神" : "伤官";
  if (controls(dayElement, candidateElement)) return samePolarity ? "偏财" : "正财";
  if (generates(candidateElement, dayElement)) return samePolarity ? "偏印" : "正印";
  return samePolarity ? "七杀" : "正官";
}

export function elementGeneratedBy(element: Element): Element {
  return ELEMENTS[(ELEMENTS.indexOf(element) + 1) % ELEMENTS.length];
}

export function elementControlledBy(element: Element): Element {
  return ELEMENTS[(ELEMENTS.indexOf(element) + 2) % ELEMENTS.length];
}

export function capReasons(hits: RuleHit[], cap = 24): RuleHit[] {
  const seen = new Set<string>();
  const result: RuleHit[] = [];
  for (const item of hits) {
    const key = `${item.code}|${item.subjects.join("|")}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
      if (result.length === cap) break;
    }
  }
  return result;
}
