/**
 * 《穷通宝鉴》调候合同。唯一运行单位是日干×月令；主取、次取保留
 * 天干，避免把丙丁、壬癸等原文差异过早压成单一五行。
 */
import { STEM_ELEMENTS, type EarthlyBranch, type Element, type HeavenlyStem } from "./constants";
import type { ClimateJudgment, NatalChart, QiState } from "./contract";

export interface QiongTongCondition {
  kind: "always" | "seasonalQi" | "dominantElement" | "lateJie";
  value?: string;
}

interface ClimateCell {
  primary: readonly HeavenlyStem[];
  secondary: readonly HeavenlyStem[];
  sourceForm?: "singleMonth" | "seasonalDefault" | "conditionalOnly";
}

export interface QiongTongClimateRule extends ClimateCell {
  dayStem: HeavenlyStem;
  monthBranch: EarthlyBranch;
  id: string;
  source: ClimateJudgment["source"];
  overrides: readonly {
    id: string;
    when: readonly QiongTongCondition[];
    primary: readonly HeavenlyStem[];
    secondary: readonly HeavenlyStem[];
    locator: string;
  }[];
}

const MONTHS = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"] as const;
const MONTH_LABELS = ["正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"] as const;
const SOURCE_URL = "https://zh.wikisource.org/zh-hans/%E7%A9%B7%E9%80%9A%E5%AE%9D%E9%89%B4";

const S = (primary: string, secondary = "", sourceForm: ClimateCell["sourceForm"] = "singleMonth"): ClimateCell => ({
  primary: [...primary] as HeavenlyStem[],
  secondary: [...secondary] as HeavenlyStem[],
  sourceForm,
});

/** 10 rows × 12 月令: every cell is a frozen base rule, not a seasonal fallback. */
const BASE: Record<HeavenlyStem, readonly ClimateCell[]> = {
  甲: [S("丙", "癸"), S("庚", "戊"), S("庚", "壬"), S("癸", "丁"), S("癸", "丁庚"), S("丁", "庚"), S("丁", "庚"), S("丁", "丙庚"), S("丁", "癸"), S("庚丁", "丙"), S("丁", "庚丙"), S("庚", "丁")],
  乙: [S("丙", "癸"), S("丙", "癸"), S("癸", "丙"), S("癸", "丙辛"), S("癸", "丙", "conditionalOnly"), S("癸", "丙", "conditionalOnly"), S("己", "丙癸"), S("癸", "丙", "conditionalOnly"), S("癸", "辛"), S("丙", "戊"), S("丙"), S("丙", "戊", "seasonalDefault")],
  丙: [S("壬", "庚"), S("壬"), S("壬", "甲"), S("壬", "庚"), S("壬", "癸"), S("壬", "庚"), S("壬", "戊"), S("壬", "癸"), S("甲", "壬"), S("壬", "戊", "conditionalOnly"), S("壬", "戊"), S("壬", "甲")],
  丁: [S("庚"), S("庚", "甲"), S("甲", "庚"), S("甲", "庚"), S("壬", "甲庚", "conditionalOnly"), S("甲", "壬"), S("甲", "庚丙"), S("甲", "庚丙"), S("甲", "庚"), S("甲", "庚", "seasonalDefault"), S("甲", "庚"), S("甲", "庚", "seasonalDefault")],
  戊: [S("丙", "甲癸"), S("丙", "甲癸"), S("甲", "丙癸"), S("甲", "丙癸"), S("壬", "甲丙"), S("癸", "丙甲"), S("丙", "癸甲"), S("丙", "癸"), S("甲", "癸"), S("甲", "丙"), S("丙", "甲"), S("丙", "甲")],
  己: [S("丙", "戊"), S("甲", "癸丙"), S("丙", "癸甲"), S("癸", "丙", "seasonalDefault"), S("癸", "丙", "seasonalDefault"), S("癸", "丙", "seasonalDefault"), S("癸", "丙辛", "seasonalDefault"), S("癸", "丙辛", "seasonalDefault"), S("甲", "癸丙辛"), S("丙", "甲", "seasonalDefault"), S("丙", "甲", "seasonalDefault"), S("丙", "甲", "seasonalDefault")],
  庚: [S("丙", "甲丁"), S("丁", "甲"), S("甲", "丁"), S("壬", "戊丙"), S("壬", "癸"), S("丁", "甲"), S("丁", "甲"), S("丁", "甲丙"), S("甲", "壬"), S("丁", "丙甲"), S("丁", "甲丙"), S("丙", "丁甲")],
  辛: [S("己", "壬庚"), S("壬", "甲"), S("壬", "甲"), S("壬", "癸"), S("壬己", "癸"), S("壬己", "庚"), S("壬", "甲戊"), S("壬", "甲"), S("壬", "甲"), S("壬", "丙"), S("壬", "丙"), S("丙", "壬戊")],
  壬: [S("庚", "丙戊"), S("戊", "辛庚"), S("甲", "庚"), S("壬", "辛庚"), S("癸", "庚辛"), S("辛", "甲癸"), S("戊", "丁"), S("甲", "庚"), S("甲", "丙"), S("戊", "丙庚"), S("戊", "丙"), S("丙", "丁甲", "conditionalOnly")],
  癸: [S("辛", "庚丙"), S("庚", "辛"), S("丙", "辛甲", "conditionalOnly"), S("辛", "庚"), S("庚辛", "壬"), S("庚辛", "", "conditionalOnly"), S("丁", "甲"), S("辛", "丙"), S("辛", "甲"), S("庚辛"), S("丙", "辛"), S("丙", "丁", "conditionalOnly")],
};

const OVERRIDES: Partial<Record<`${HeavenlyStem}:${EarthlyBranch}`, QiongTongClimateRule["overrides"]>> = {
  "乙:午": [
    { id: "qtb:乙:午:after-summer-solstice", when: [{ kind: "seasonalQi", value: "夏至" }], primary: ["丙"], secondary: ["癸"], locator: "五月乙木·夏至后" },
  ],
  "乙:酉": [
    { id: "qtb:乙:酉:after-autumn-equinox", when: [{ kind: "seasonalQi", value: "秋分" }], primary: ["丙"], secondary: ["癸"], locator: "八月乙木·秋分后" },
  ],
  "丙:亥": [
    { id: "qtb:丙:亥:wood-dominant", when: [{ kind: "dominantElement", value: "木" }], primary: ["庚"], secondary: [], locator: "十月丙火·木旺" },
    { id: "qtb:丙:亥:water-dominant", when: [{ kind: "dominantElement", value: "水" }], primary: ["戊"], secondary: [], locator: "十月丙火·水旺" },
    { id: "qtb:丙:亥:fire-dominant", when: [{ kind: "dominantElement", value: "火" }], primary: ["壬"], secondary: [], locator: "十月丙火·火旺" },
  ],
  "壬:丑": [
    { id: "qtb:壬:丑:late-jie", when: [{ kind: "lateJie" }], primary: ["丙"], secondary: ["丁", "甲"], locator: "十二月壬水·下半月" },
  ],
  "癸:辰": [
    { id: "qtb:癸:辰:after-grain-rain", when: [{ kind: "seasonalQi", value: "谷雨" }], primary: ["辛"], secondary: ["甲"], locator: "三月癸水·谷雨后" },
  ],
  "癸:未": [
    { id: "qtb:癸:未:late-jie", when: [{ kind: "lateJie" }], primary: ["辛"], secondary: ["庚"], locator: "六月癸水·下半月" },
  ],
};

function seasonName(dayStem: HeavenlyStem, month: EarthlyBranch): string {
  const group = MONTHS.indexOf(month as (typeof MONTHS)[number]);
  const season = group < 3 ? "三春" : group < 6 ? "三夏" : group < 9 ? "三秋" : "三冬";
  return `论${dayStem}${STEM_ELEMENTS[dayStem]}·${season}${dayStem}${STEM_ELEMENTS[dayStem]}·${MONTH_LABELS[group]}${dayStem}${STEM_ELEMENTS[dayStem]}`;
}

export const QIONGTONG_CLIMATE_RULES: readonly QiongTongClimateRule[] = (Object.keys(BASE) as HeavenlyStem[]).flatMap((dayStem) =>
  MONTHS.map((monthBranch, index) => {
    const cell = BASE[dayStem][index];
    return {
      ...cell,
      dayStem,
      monthBranch,
      id: `qtb:${dayStem}:${monthBranch}:base`,
      source: { work: "《穷通宝鉴》", section: seasonName(dayStem, monthBranch), url: SOURCE_URL, locator: cell.sourceForm === "singleMonth" ? `${MONTH_LABELS[index]}条` : "三季总则" },
      overrides: OVERRIDES[`${dayStem}:${monthBranch}`] ?? [],
    };
  }),
);

function conditionsMatch(conditions: readonly QiongTongCondition[], natal: NatalChart, qi: QiState): boolean {
  return conditions.every((condition) => {
    if (condition.kind === "always") return true;
    if (condition.kind === "seasonalQi") return natal.seasonalQi === condition.value;
    if (condition.kind === "lateJie") return natal.seasonalProgressPermille >= 500;
    const dominant = (Object.keys(qi.elementStrength) as Element[]).reduce((best, element) => qi.elementStrength[element] > qi.elementStrength[best] ? element : best, "木");
    return dominant === condition.value;
  });
}

/** Matches exactly one frozen rule and the first satisfied explicit override. */
export function qiongTongClimateOf(natal: NatalChart, qi: QiState): ClimateJudgment {
  const dayMaster = natal.dayMaster.stem as HeavenlyStem;
  const monthBranch = natal.pillars[1].branch as EarthlyBranch;
  const rule = QIONGTONG_CLIMATE_RULES.find((candidate) => candidate.dayStem === dayMaster && candidate.monthBranch === monthBranch);
  if (!rule) throw new Error(`穷通宝鉴调候表缺少日干月令: ${dayMaster}${monthBranch}`);
  const override = rule.overrides.find((candidate) => conditionsMatch(candidate.when, natal, qi));
  const primaryStems = override?.primary ?? rule.primary;
  const secondaryStems = override?.secondary ?? rule.secondary;
  return {
    dayMaster,
    monthBranch,
    clauseId: override?.id ?? rule.id,
    primaryStems: [...primaryStems],
    secondaryStems: [...secondaryStems],
    primaryElements: [...new Set(primaryStems.map((stem) => STEM_ELEMENTS[stem]))],
    secondaryElements: [...new Set(secondaryStems.map((stem) => STEM_ELEMENTS[stem]))],
    matchedConditions: override ? override.when.map((condition) => condition.kind === "seasonalQi" ? `已过${condition.value}` : condition.kind === "lateJie" ? "节内后段" : `${condition.value}偏旺`) : ["月令基础条款"],
    source: override ? { ...rule.source, locator: override.locator } : rule.source,
  };
}
