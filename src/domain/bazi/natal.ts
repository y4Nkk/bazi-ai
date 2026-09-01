/** Natal four-pillar chart derived from one evaluated wall clock. */
import { BRANCH_ELEMENTS, STEM_ELEMENTS, type Element } from "./constants";
import { monthYearPillarsAtInstant, seasonalProgressPermilleAtInstant, solarOf } from "./calendar";
import { HIDDEN_STEM_WEIGHTS, SHENSHA, YANG_REN_BRANCH, hiddenStemRank, lifeStageOf, nayinOf, tenGodOf, voidBranchesOf } from "./rules";
import type { NatalChart, PillarFact, PillarName, RootGrade } from "./contract";

/**
 * Day and hour are evaluated from the selected local/true-solar wall clock.
 * When supplied, the unique actual instant solely owns the year/month
 * solar-term boundary, which lunar-typescript represents in fixed UTC+08.
 */
export function natalChartOf(localDateTime: string, birthInstant?: string): NatalChart {
  const lunar = solarOf(localDateTime).getLunar();
  const ec = lunar.getEightChar();
  const dayMasterStem = ec.getDayGan();
  const yearMonth = birthInstant
    ? monthYearPillarsAtInstant(birthInstant)
    : { yearGZ: ec.getYear(), monthGZ: ec.getMonth() };

  const pillars: PillarFact[] = [
    pillarFact("year", yearMonth.yearGZ, dayMasterStem, tenGodOf(dayMasterStem, yearMonth.yearGZ[0])),
    pillarFact("month", yearMonth.monthGZ, dayMasterStem, tenGodOf(dayMasterStem, yearMonth.monthGZ[0])),
    pillarFact("day", ec.getDay(), dayMasterStem, "日主"),
    pillarFact("hour", ec.getTime(), dayMasterStem, ec.getTimeShiShenGan()),
  ];

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
    voidBranches: voidBranchesOf(pillars[2].ganzhi),
    roots: pillars.flatMap((pillar) => pillar.hiddenStemFacts
      .filter((hidden) => hidden.element === STEM_ELEMENTS[dayMasterStem as keyof typeof STEM_ELEMENTS])
      .map((hidden) => ({ pillar: pillar.name, stem: hidden.stem, grade: ["临官", "帝旺"].includes(pillar.lifeStage) ? "prosperous" as const : rootGrade(hidden.rank) }))),
    annotations: annotationsOf(dayMasterStem, pillars.map((pillar) => pillar.branch), voidBranchesOf(pillars[2].ganzhi)),
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


function groupAnnotation(branches: string[], groups: Array<[string, string]>, label: string, code: string): Array<{ code: string; label: string; subjects: string[] }> {
  return groups.flatMap(([base, target]) => branches.some((branch) => base.includes(branch)) && branches.includes(target)
    ? [{ code, label, subjects: [target] }]
    : []);
}

function annotationsOf(dayStem: string, branches: string[], voidBranches: string[]): Array<{ code: string; label: string; subjects: string[] }> {
  const annotations = [
    ...(branches.some((branch) => SHENSHA.tianYi[dayStem as keyof typeof SHENSHA.tianYi].includes(branch)) ? [{ code: "SHENSHA_TIAN_YI", label: "天乙贵人", subjects: branches.filter((branch) => SHENSHA.tianYi[dayStem as keyof typeof SHENSHA.tianYi].includes(branch)) }] : []),
    ...(branches.some((branch) => branch === SHENSHA.wenChang[dayStem as keyof typeof SHENSHA.wenChang]) ? [{ code: "SHENSHA_WEN_CHANG", label: "文昌", subjects: [SHENSHA.wenChang[dayStem as keyof typeof SHENSHA.wenChang]] }] : []),
    ...(branches.some((branch) => branch === SHENSHA.lu[dayStem as keyof typeof SHENSHA.lu]) ? [{ code: "SHENSHA_LU", label: "禄", subjects: [SHENSHA.lu[dayStem as keyof typeof SHENSHA.lu]] }] : []),
    ...(branches.some((branch) => branch === YANG_REN_BRANCH[dayStem as keyof typeof YANG_REN_BRANCH]) ? [{ code: "SHENSHA_YANG_REN", label: "羊刃", subjects: [YANG_REN_BRANCH[dayStem as keyof typeof YANG_REN_BRANCH]] }] : []),
    ...groupAnnotation(branches, SHENSHA.yiMaGroups, "驿马", "SHENSHA_YI_MA"),
    ...groupAnnotation(branches, SHENSHA.taoHuaGroups, "桃花", "SHENSHA_TAO_HUA"),
    ...groupAnnotation(branches, SHENSHA.huaGaiGroups, "华盖", "SHENSHA_HUA_GAI"),
    ...branches.filter((branch) => voidBranches.includes(branch)).map((branch) => ({ code: "SHENSHA_KONG_WANG", label: "空亡", subjects: [branch] })),
  ];
  return annotations;
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
  };
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
