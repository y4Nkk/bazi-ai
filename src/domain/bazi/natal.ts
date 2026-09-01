/** Natal four-pillar chart derived from one evaluated wall clock. */
import { BRANCH_ELEMENTS, EARTHLY_BRANCHES, HEAVENLY_STEMS, STEM_ELEMENTS, branchIndexOf, stemIndexOf, type EarthlyBranch, type Element, type HeavenlyStem } from "./constants";
import { modelSolarOfInstant, monthYearPillarsAtInstant, seasonalProgressPermilleAtInstant, solarOf } from "./calendar";
import { GAN_WUHE, HIDDEN_STEM_WEIGHTS, LIUHE, hiddenStemRank, lifeStageOf, nayinOf, tenGodOf, voidBranchesOf } from "./rules";
import { shenshaForGanzhi, type ShenshaContext } from "./shensha";
import type { AuxiliaryPillarFact, NatalChart, PillarFact, PillarName, RootGrade } from "./contract";

/**
 * Day and hour are evaluated from the selected local/true-solar wall clock.
 * When supplied, the unique actual instant solely owns the year/month
 * solar-term boundary, which lunar-typescript represents in fixed UTC+08.
 */
export function natalChartOf(localDateTime: string, birthInstant?: string): NatalChart {
  const lunar = solarOf(localDateTime).getLunar();
  const seasonalLunar = birthInstant ? modelSolarOfInstant(birthInstant).getLunar() : lunar;
  const ec = lunar.getEightChar();
  const dayMasterStem = ec.getDayGan();
  const yearMonth = birthInstant
    ? monthYearPillarsAtInstant(birthInstant)
    : { yearGZ: ec.getYear(), monthGZ: ec.getMonth() };

  const rawPillars: PillarFact[] = [
    pillarFact("year", yearMonth.yearGZ, dayMasterStem, tenGodOf(dayMasterStem, yearMonth.yearGZ[0])),
    pillarFact("month", yearMonth.monthGZ, dayMasterStem, tenGodOf(dayMasterStem, yearMonth.monthGZ[0])),
    pillarFact("day", ec.getDay(), dayMasterStem, "日主"),
    pillarFact("hour", ec.getTime(), dayMasterStem, ec.getTimeShiShenGan()),
  ];
  const voidBranches = voidBranchesOf(rawPillars[2].ganzhi) as EarthlyBranch[];
  const shenshaContext: ShenshaContext = {
    dayStem: dayMasterStem as HeavenlyStem,
    dayBranch: rawPillars[2].branch as EarthlyBranch,
    monthBranch: rawPillars[1].branch as EarthlyBranch,
    yearBranch: rawPillars[0].branch as EarthlyBranch,
    voidBranches,
  };
  const pillars = rawPillars.map((pillar) => ({
    ...pillar,
    shensha: shenshaForGanzhi(shenshaContext, pillar.ganzhi),
  }));

  const elementCounts = emptyElementCounts();
  for (const pillar of pillars) {
    elementCounts[pillar.stemElement] += 1;
    elementCounts[pillar.branchElement] += 1;
  }

  const tenGodCounts: Record<string, number> = {};
  for (const pillar of pillars) {
    if (pillar.name !== "day") countTenGod(tenGodCounts, pillar.stemTenGod);
    for (const god of pillar.hiddenTenGods) countTenGod(tenGodCounts, god);
  }

  return {
    pillars,
    dayMaster: { stem: dayMasterStem, element: STEM_ELEMENTS[dayMasterStem as keyof typeof STEM_ELEMENTS] },
    elementCounts,
    tenGodCounts,
    monthCommand: pillars[1].hiddenStemFacts[0],
    seasonalProgressPermille: birthInstant
      ? seasonalProgressPermilleAtInstant(birthInstant)
      : seasonalProgressPermille(localDateTime, lunar.getPrevJie().getSolar().toYmdHms(), lunar.getNextJie().getSolar().toYmdHms()),
    seasonalQi: seasonalLunar.getPrevQi().getName(),
    voidBranches,
    roots: pillars.flatMap((pillar) => pillar.hiddenStemFacts
      .filter((hidden) => hidden.element === STEM_ELEMENTS[dayMasterStem as keyof typeof STEM_ELEMENTS])
      .map((hidden) => ({ pillar: pillar.name, stem: hidden.stem, grade: ["临官", "帝旺"].includes(pillar.lifeStage) ? "prosperous" as const : rootGrade(hidden.rank) }))),
    annotations: uniqueShensha(pillars.flatMap((pillar) => pillar.shensha)),
    auxiliaryPillars: auxiliaryPillarsOf(pillars),
  };
}

function seasonalProgressPermille(localDateTime: string, previousJie: string, nextJie: string): number {
  const at = Date.parse(`${localDateTime}Z`);
  const start = Date.parse(`${previousJie.replace(" ", "T")}Z`);
  const end = Date.parse(`${nextJie.replace(" ", "T")}Z`);
  if (!Number.isFinite(at) || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    throw new Error("节气区间无法计算");
  }
  return Math.max(0, Math.min(1000, Math.floor(((at - start) * 1000) / (end - start))));
}

function pillarFact(
  name: PillarName,
  ganzhi: string,
  dayMasterStem: string,
  stemTenGod: string,
): PillarFact {
  const [stem, branch] = [ganzhi[0], ganzhi[1]];
  const hiddenStemFacts = HIDDEN_STEM_WEIGHTS[branch as keyof typeof HIDDEN_STEM_WEIGHTS].map(([hiddenStem, qiWeight], index) => ({
    stem: hiddenStem,
    element: STEM_ELEMENTS[hiddenStem],
    tenGod: tenGodOf(dayMasterStem, hiddenStem),
    rank: hiddenStemRank(index),
    qiWeight,
  }));
  return {
    name,
    ganzhi,
    stem,
    branch,
    stemElement: STEM_ELEMENTS[stem as keyof typeof STEM_ELEMENTS],
    branchElement: BRANCH_ELEMENTS[branch as keyof typeof BRANCH_ELEMENTS],
    stemTenGod,
    hiddenStems: hiddenStemFacts.map((item) => item.stem),
    hiddenTenGods: hiddenStemFacts.map((item) => item.tenGod),
    hiddenStemFacts,
    lifeStage: lifeStageOf(dayMasterStem, branch),
    nayin: nayinOf(ganzhi),
    shensha: [],
  };
}

const MONTH_BRANCH_ORDER = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"] as const;

function auxiliaryPillarsOf(pillars: PillarFact[]): AuxiliaryPillarFact[] {
  const [year, month, day, hour] = pillars;
  const taiYuan = HEAVENLY_STEMS[(stemIndexOf(month.stem) + 1) % 10]
    + EARTHLY_BRANCHES[(branchIndexOf(month.branch) + 3) % 12];
  const taiXiStem = HEAVENLY_STEMS.find((stem) => GAN_WUHE.has(`${day.stem}${stem}`));
  const taiXiBranch = LIUHE[day.branch as EarthlyBranch];
  if (!taiXiStem || !taiXiBranch) throw new Error("胎息干支无法计算");
  const taiXi = taiXiStem + taiXiBranch;
  const monthIndex = MONTH_BRANCH_ORDER.indexOf(month.branch as (typeof MONTH_BRANCH_ORDER)[number]) + 1;
  const timeMonthIndex = MONTH_BRANCH_ORDER.indexOf(hour.branch as (typeof MONTH_BRANCH_ORDER)[number]) + 1;
  if (monthIndex === 0 || timeMonthIndex === 0) throw new Error("命身宫月时支无法计算");
  const mingSum = monthIndex + timeMonthIndex;
  const mingOffset = (mingSum >= 14 ? 26 : 14) - mingSum;
  const shenSum = monthIndex + branchIndexOf(hour.branch) + 1;
  const shenOffset = shenSum > 12 ? shenSum - 12 : shenSum;
  const mingGong = auxiliaryGanzhi(year.stem, mingOffset);
  const shenGong = auxiliaryGanzhi(year.stem, shenOffset);
  return [
    { name: "胎元", ganzhi: taiYuan, nayin: nayinOf(taiYuan) },
    { name: "胎息", ganzhi: taiXi, nayin: nayinOf(taiXi) },
    { name: "命宫", ganzhi: mingGong, nayin: nayinOf(mingGong) },
    { name: "身宫", ganzhi: shenGong, nayin: nayinOf(shenGong) },
  ];
}

function auxiliaryGanzhi(yearStem: string, offset: number): string {
  const stem = HEAVENLY_STEMS[((stemIndexOf(yearStem) + 1) * 2 + offset - 1) % 10];
  return stem + MONTH_BRANCH_ORDER[offset - 1];
}

function uniqueShensha(facts: PillarFact["shensha"]): PillarFact["shensha"] {
  const seen = new Set<string>();
  return facts.filter((fact) => {
    const key = `${fact.code}|${fact.target}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function rootGrade(rank: "main" | "middle" | "residual"): RootGrade {
  return rank === "main" ? "main" : rank === "middle" ? "middle" : "residual";
}

function emptyElementCounts(): Record<Element, number> {
  return { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 } as Record<Element, number>;
}

function countTenGod(counts: Record<string, number>, name: string): void {
  if (!name || name === "日主") return;
  counts[name] = (counts[name] ?? 0) + 1;
}
