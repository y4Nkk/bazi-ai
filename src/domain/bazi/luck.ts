/** Exact ZP-1 大运 direction, 起运 conversion, and ten-year intervals. */
import { ganzhiIndexOf, ganzhiOf, solarOf } from "./calendar";
import { stemYinYang } from "./rules";
import type { ChartGender, LuckCycle, LuckInfo } from "./contract";

const LUCK_CYCLE_COUNT = 10;
const DAY_MS = 86_400_000;

interface AgeDetail { years: number; months: number; days: number }

function formatLocal(millis: number): string {
  const d = new Date(millis);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function localMillis(dateTime: string): number {
  const value = Date.parse(`${dateTime}${dateTime.length === 16 ? ":00" : ""}Z`);
  if (!Number.isFinite(value)) throw new Error(`无效本地时刻: ${dateTime}`);
  return value;
}

/** 三日一岁、一日四月、一时辰十日, carried as a non-rounded age. */
function ageFromJieDistance(distanceMillis: number): AgeDetail {
  const months = Math.max(0, Math.floor((distanceMillis * 4) / DAY_MS));
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  const remainder = distanceMillis - (months * DAY_MS) / 4;
  const days = Math.floor((Math.max(0, remainder) * 10) / (2 * 60 * 60 * 1_000));
  return { years, months: remainingMonths, days };
}

function addAge(localDateTime: string, age: AgeDetail): string {
  const date = new Date(localMillis(localDateTime));
  date.setUTCFullYear(date.getUTCFullYear() + age.years);
  date.setUTCMonth(date.getUTCMonth() + age.months);
  date.setUTCDate(date.getUTCDate() + age.days);
  return formatLocal(date.getTime());
}

function addYears(localDateTime: string, years: number): string {
  const date = new Date(localMillis(localDateTime));
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return formatLocal(date.getTime());
}

function startYear(dateTime: string): number {
  return Number(dateTime.slice(0, 4));
}

export function luckInfoOf(localDateTime: string, gender: ChartGender): LuckInfo {
  const solar = solarOf(localDateTime);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();
  const forward = (stemYinYang(eightChar.getYearGan()) === "yang") === (gender === "male");
  const jieSolar = forward ? lunar.getNextJie().getSolar() : lunar.getPrevJie().getSolar();
  const jieDateTime = jieSolar.toYmdHms().replace(" ", "T");
  const distance = Math.abs(localMillis(jieDateTime) - localMillis(localDateTime));
  const age = ageFromJieDistance(distance);
  const startDateTime = addAge(localDateTime, age);
  const monthIndex = ganzhiIndexOf(eightChar.getMonth());
  const cycles: LuckCycle[] = [{
    index: 0,
    ganzhi: null,
    startYear: startYear(localDateTime),
    endYear: startYear(startDateTime),
    startAge: 0,
    endAge: age.years,
    startDateTime: localDateTime,
    endDateTime: startDateTime,
    startAgeDetail: { years: 0, months: 0, days: 0 },
  }];
  for (let index = 1; index <= LUCK_CYCLE_COUNT; index += 1) {
    const start = addYears(startDateTime, (index - 1) * 10);
    const end = addYears(startDateTime, index * 10);
    cycles.push({
      index,
      ganzhi: ganzhiOf(monthIndex + (forward ? index : -index)),
      startYear: startYear(start),
      endYear: startYear(end),
      startAge: age.years + (index - 1) * 10,
      endAge: age.years + index * 10,
      startDateTime: start,
      endDateTime: end,
      startAgeDetail: index === 1 ? age : { years: age.years + (index - 1) * 10, months: age.months, days: age.days },
    });
  }
  return {
    forward,
    directionLabel: forward ? "顺行" : "逆行",
    startDateTime,
    startAgeLabel: `${age.years}岁${age.months}月${age.days}日起运`,
    cycles,
  };
}
