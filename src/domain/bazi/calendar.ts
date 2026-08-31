/**
 * Calendar facts via lunar-typescript, plus the fast transit-pillar machinery:
 * month/year pillars come from exact solar-term (节) segment boundaries, the
 * day pillar from day-count arithmetic anchored to one library call, and the
 * hour pillar from the fixed day-stem/shichen formula. All results match a
 * direct EightChar evaluation at the same wall clock (verified by fixtures).
 */
import { Solar } from "lunar-typescript";
import {
  EARTHLY_BRANCHES,
  HEAVENLY_STEMS,
  branchIndexOf,
  stemIndexOf,
} from "./constants";
import type { CalendarFacts } from "./contract";

/** Pinned to the installed lunar-typescript facts implementation. */
export const CALENDAR_MODEL_REVISION = "lunar-typescript-1.8.6";

const DAY_ANCHOR_DATE = "2000-01-01";
const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

export function solarOf(localDateTime: string): Solar {
  const [datePart, timePart] = localDateTime.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second = 0] = timePart.split(":").map(Number);
  return Solar.fromYmdHms(year, month, day, hour, minute, second);
}

export function calendarFactsOf(localDateTime: string): CalendarFacts {
  const lunar = solarOf(localDateTime).getLunar();
  const month = lunar.getMonth();
  const prev = lunar.getPrevJieQi();
  const next = lunar.getNextJieQi();
  return {
    lunarYearInChinese: lunar.getYearInChinese(),
    lunarMonthLabel: `${month < 0 ? "闰" : ""}${lunar.getMonthInChinese()}月`,
    lunarDayInChinese: lunar.getDayInChinese(),
    animal: lunar.getYearShengXiao(),
    prevJieQi: { name: prev.getName(), solar: formatSolar(prev.getSolar()) },
    nextJieQi: { name: next.getName(), solar: formatSolar(next.getSolar()) },
  };
}

function formatSolar(solar: Solar): string {
  return solar.toYmdHms().replace(" ", "T");
}

/* ------------------------------------------------------------------ */
/* Date helpers                                                        */
/* ------------------------------------------------------------------ */

export function parseDay(dateStr: string): number {
  return Date.parse(`${dateStr}T00:00Z`);
}

export function formatDay(utcMillis: number): string {
  const d = new Date(utcMillis);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDays(dateStr: string, days: number): string {
  return formatDay(parseDay(dateStr) + days * DAY_MS);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseDay(to) - parseDay(from)) / DAY_MS);
}

export function enumerateDays(start: string, end: string): string[] {
  const out: string[] = [];
  for (let cursor = parseDay(start); cursor <= parseDay(end); cursor += DAY_MS) {
    out.push(formatDay(cursor));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Ganzhi indices                                                      */
/* ------------------------------------------------------------------ */

export function ganzhiIndexOf(ganzhi: string): number {
  const stem = stemIndexOf(ganzhi[0]);
  const branch = branchIndexOf(ganzhi[1]);
  for (let i = 0; i < 60; i += 1) {
    if (i % 10 === stem && i % 12 === branch) return i;
  }
  throw new Error(`无效干支: ${ganzhi}`);
}

export function ganzhiOf(index: number): string {
  const i = ((index % 60) + 60) % 60;
  return HEAVENLY_STEMS[i % 10] + EARTHLY_BRANCHES[i % 12];
}

let dayAnchorIndex: number | null = null;

/** Continuous sexagenary day pillar; the anchor is derived from one library call. */
export function dayPillarFor(dateStr: string): string {
  if (dayAnchorIndex === null) {
    dayAnchorIndex = ganzhiIndexOf(
      solarOf(`${DAY_ANCHOR_DATE}T12:00`).getLunar().getEightChar().getDay(),
    );
  }
  return ganzhiOf(dayAnchorIndex + daysBetween(DAY_ANCHOR_DATE, dateStr));
}

/**
 * Hour pillar from the day pillar and the shichen index (甲己日起甲子时).
 * For 晚子时 (23:00) pass the NEXT day's pillar as `dayGanzhi`: the hour stem
 * follows the coming midnight, matching the library's convention.
 */
export function hourPillarFor(dayGanzhi: string, shichenIndex: number): string {
  const stemIndex = (stemIndexOf(dayGanzhi[0]) * 2 + shichenIndex) % 10;
  return HEAVENLY_STEMS[stemIndex] + EARTHLY_BRANCHES[shichenIndex];
}

/* ------------------------------------------------------------------ */
/* Solar-term month segments                                           */
/* ------------------------------------------------------------------ */

/**
 * One month pillar segment: [start, jieEndMoment) holds a constant month and
 * year pillar. jieEndMoment is the exact local wall clock of the next 节.
 */
export interface MonthSegment {
  start: string;
  jieEndMoment: string;
  yearGZ: string;
  monthGZ: string;
}

export interface SegmentTable {
  segments: MonthSegment[];
}

/**
 * Builds the 节 segment table covering [rangeStart, rangeEnd]. The cursor
 * starts 45 days early so every lookup finds a segment whose start precedes
 * the requested window.
 */
export function buildSegmentTable(rangeStart: string, rangeEnd: string): SegmentTable {
  const segments: MonthSegment[] = [];
  let cursor = addDays(rangeStart, -45);
  // Cover through the end of the last range day: evaluations at 23:00 must
  // still fall inside a segment even when the range ends on a jie day.
  const last = addDays(rangeEnd, 1);
  while (cursor <= last) {
    const lunar = solarOf(`${cursor}T12:00`).getLunar();
    const nextJie = lunar.getNextJie();
    const jieSolar = nextJie.getSolar();
    const jieEndMoment = formatSolar(jieSolar);
    // Anchor one minute before the boundary: always inside the closing segment.
    const anchor = solarOf(shiftMinute(jieEndMoment, -1)).getLunar().getEightChar();
    segments.push({
      start: cursor,
      jieEndMoment,
      yearGZ: anchor.getYear(),
      monthGZ: anchor.getMonth(),
    });
    // The jie may fall later the same day; always step past its date to terminate.
    cursor = addDays(jieSolar.toYmd(), 1);
  }
  return { segments };
}

function shiftMinute(localDateTime: string, minutes: number): string {
  const shifted = new Date(Date.parse(`${localDateTime}${localDateTime.length === 16 ? ":00" : ""}Z`) + minutes * MINUTE_MS);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}` +
    `T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}`
  );
}

/** Month and year pillars in effect at an exact local wall clock. */
export function monthYearPillarsFor(
  table: SegmentTable,
  evalDateTime: string,
): { yearGZ: string; monthGZ: string } {
  for (const segment of table.segments) {
    if (evalDateTime < segment.jieEndMoment) {
      return { yearGZ: segment.yearGZ, monthGZ: segment.monthGZ };
    }
  }
  throw new Error(`节气区间表未覆盖时刻 ${evalDateTime}`);
}
