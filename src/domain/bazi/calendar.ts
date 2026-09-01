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
import { instantMillisOf } from "./astronomy";
import type { CalendarFacts } from "./contract";

/** Pinned to the installed lunar-typescript facts implementation. */
export const CALENDAR_MODEL_REVISION = "lunar-typescript-1.8.6-cst-instant-v2";

const DAY_ANCHOR_DATE = "2000-01-01";
const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;
const MODEL_UTC_OFFSET_MS = 8 * 60 * MINUTE_MS;

/**
 * lunar-typescript publishes its solar-term wall clocks in the fixed
 * UTC+08 calendar model.  Never compare those values directly with a birth
 * place wall clock: first turn the unique instant into this model clock.
 */
export function modelClockOfInstant(birthInstant: string): string {
  const millis = instantMillisOf(birthInstant);
  return formatUtcDateTime(millis + MODEL_UTC_OFFSET_MS);
}

/** The same instant expressed by the model clock as a lunar-typescript Solar. */
export function modelSolarOfInstant(birthInstant: string): Solar {
  return solarOf(modelClockOfInstant(birthInstant));
}

export function solarOf(localDateTime: string): Solar {
  const [datePart, timePart] = localDateTime.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second = 0] = timePart.split(":").map(Number);
  return Solar.fromYmdHms(year, month, day, hour, minute, second);
}

/**
 * Calendar facts at a unique instant.  Lunar-typescript solar terms are read
 * at the corresponding fixed UTC+08 model clock rather than a place wall
 * clock, so the adjacent jie is correct for New York, DST, and every IANA
 * zone alike.
 */
export function calendarFactsOfInstant(birthInstant: string): CalendarFacts {
  return calendarFactsFromLunar(modelSolarOfInstant(birthInstant).getLunar());
}

function calendarFactsFromLunar(lunar: ReturnType<Solar["getLunar"]>): CalendarFacts {
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

export interface JieBoundary {
  name: string;
  /** lunar-typescript's fixed UTC+08 wall-clock representation. */
  modelDateTime: string;
  /** The same boundary as a UTC ISO instant. */
  instant: string;
}

export interface AdjacentJieBoundaries {
  previous: JieBoundary;
  next: JieBoundary;
}

/** Exact adjacent 节 boundaries surrounding a unique instant. */
export function adjacentJieBoundariesAtInstant(birthInstant: string): AdjacentJieBoundaries {
  const lunar = modelSolarOfInstant(birthInstant).getLunar();
  return {
    previous: jieBoundaryOf(lunar.getPrevJie()),
    next: jieBoundaryOf(lunar.getNextJie()),
  };
}

function jieBoundaryOf(jie: ReturnType<ReturnType<Solar["getLunar"]>["getPrevJie"]>): JieBoundary {
  const modelDateTime = formatSolar(jie.getSolar());
  return {
    name: jie.getName(),
    modelDateTime,
    instant: formatInstant(new Date(`${modelDateTime}+08:00`).getTime()),
  };
}

/** Year and month pillars determined at a unique instant in the UTC+08 model. */
export function monthYearPillarsAtInstant(birthInstant: string): { yearGZ: string; monthGZ: string } {
  const eightChar = modelSolarOfInstant(birthInstant).getLunar().getEightChar();
  return { yearGZ: eightChar.getYear(), monthGZ: eightChar.getMonth() };
}

/** Position within the enclosing 节 interval, in integer thousandths. */
export function seasonalProgressPermilleAtInstant(birthInstant: string): number {
  const at = instantMillisOf(birthInstant);
  const { previous, next } = adjacentJieBoundariesAtInstant(birthInstant);
  const start = Date.parse(previous.instant);
  const end = Date.parse(next.instant);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    throw new Error("节气区间无法计算");
  }
  return Math.max(0, Math.min(1000, Math.floor(((at - start) * 1000) / (end - start))));
}

function formatSolar(solar: Solar): string {
  return solar.toYmdHms().replace(" ", "T");
}

function formatUtcDateTime(utcMillis: number): string {
  const d = new Date(utcMillis);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function formatInstant(utcMillis: number): string {
  return new Date(utcMillis).toISOString().slice(0, 19) + "Z";
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
 * One month pillar segment ends at one actual 节 instant. Local dates only
 * enumerate the locked model's term data; callers never compare wall clocks.
 */
export interface MonthSegment {
  jieEndInstant: string;
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
    const jieEndInstant = formatInstant(new Date(`${jieEndMoment}+08:00`).getTime());
    // Anchor one second before the boundary: always inside the closing segment.
    const anchor = solarOf(shiftMinute(jieEndMoment, -1 / 60)).getLunar().getEightChar();
    segments.push({
      jieEndInstant,
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

/** Month and year pillars in effect at an exact instant. */
export function monthYearPillarsFor(
  table: SegmentTable,
  evalInstant: string,
): { yearGZ: string; monthGZ: string } {
  const at = instantMillisOf(evalInstant);
  for (const segment of table.segments) {
    if (at < Date.parse(segment.jieEndInstant)) {
      return { yearGZ: segment.yearGZ, monthGZ: segment.monthGZ };
    }
  }
  throw new Error(`节气区间表未覆盖时刻 ${evalInstant}`);
}
