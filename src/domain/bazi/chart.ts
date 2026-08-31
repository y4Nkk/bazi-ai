/** Natal four-pillar chart derived from one evaluated wall clock. */
import { BRANCH_ELEMENTS, STEM_ELEMENTS, type Element } from "./constants";
import { solarOf } from "./calendar";
import type { NatalChart, PillarFact, PillarName } from "./types";

export function natalChartOf(localDateTime: string): NatalChart {
  const ec = solarOf(localDateTime).getLunar().getEightChar();
  const dayMasterStem = ec.getDayGan();

  const pillars: PillarFact[] = [
    pillarFact("year", ec.getYear(), ec.getYearHideGan(), ec.getYearShiShenZhi(), ec.getYearShiShenGan()),
    pillarFact("month", ec.getMonth(), ec.getMonthHideGan(), ec.getMonthShiShenZhi(), ec.getMonthShiShenGan()),
    pillarFact("day", ec.getDay(), ec.getDayHideGan(), ec.getDayShiShenZhi(), "日主"),
    pillarFact("hour", ec.getTime(), ec.getTimeHideGan(), ec.getTimeShiShenZhi(), ec.getTimeShiShenGan()),
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
  };
}

function pillarFact(
  name: PillarName,
  ganzhi: string,
  hiddenStems: string[],
  hiddenTenGods: string[],
  stemTenGod: string,
): PillarFact {
  const [stem, branch] = [ganzhi[0], ganzhi[1]];
  return {
    name,
    ganzhi,
    stem,
    branch,
    stemElement: STEM_ELEMENTS[stem as keyof typeof STEM_ELEMENTS],
    branchElement: BRANCH_ELEMENTS[branch as keyof typeof BRANCH_ELEMENTS],
    stemTenGod,
    hiddenStems,
    hiddenTenGods,
  };
}

function emptyElementCounts(): Record<Element, number> {
  return { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 } as Record<Element, number>;
}

function countTenGod(counts: Record<string, number>, name: string): void {
  if (!name || name === "日主") return;
  counts[name] = (counts[name] ?? 0) + 1;
}
