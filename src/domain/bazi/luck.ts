/** Luck cycles (大运) from the evaluated natal chart. */
import { solarOf } from "./calendar";
import type { ChartGender, LuckCycle, LuckInfo } from "./types";

const LUCK_CYCLE_COUNT = 10;

export function luckInfoOf(localDateTime: string, gender: ChartGender): LuckInfo {
  const ec = solarOf(localDateTime).getLunar().getEightChar();
  const yun = ec.getYun(gender === "male" ? 1 : 0);
  const startSolar = yun.getStartSolar();
  const cycles: LuckCycle[] = yun.getDaYun(LUCK_CYCLE_COUNT).map((daYun) => ({
    index: daYun.getIndex(),
    ganzhi: daYun.getGanZhi() || null,
    startYear: daYun.getStartYear(),
    endYear: daYun.getEndYear(),
    startAge: daYun.getStartAge(),
    endAge: daYun.getEndAge(),
  }));
  const firstWithPillar = cycles.find((cycle) => cycle.ganzhi);
  return {
    forward: yun.isForward(),
    directionLabel: yun.isForward() ? "顺行" : "逆行",
    startDateTime: startSolar.toYmdHms().replace(" ", "T").slice(0, 16),
    startAgeLabel: firstWithPillar
      ? `${firstWithPillar.startAge} 岁起运`
      : "起运时间待定",
    cycles,
  };
}
