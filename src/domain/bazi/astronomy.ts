/**
 * Instant and civil-clock ownership for ZP-1. Every algorithmic birth time is
 * one ISO-8601 instant with an explicit offset; local wall-clock text is only
 * a derived display/candidate value.
 */
const SECOND = 1_000;
const MINUTE = 60 * SECOND;
export const ASTRONOMY_MODEL_REVISION = "noaa-eot-2006";
const INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/;
const formatterCache = new Map<string, Intl.DateTimeFormat>();
const offsetFormatterCache = new Map<string, Intl.DateTimeFormat>();

function offsetFormatter(timezone: string): Intl.DateTimeFormat {
  let value = offsetFormatterCache.get(timezone);
  if (!value) {
    value = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    offsetFormatterCache.set(timezone, value);
  }
  return value;
}

/** UTC offset of the IANA timezone at the supplied instant, in minutes east of UTC. */
export function timezoneOffsetMinutes(timezone: string, utcMillis: number): number {
  const parts = offsetFormatter(timezone).formatToParts(utcMillis);
  const get = (type: Intl.DateTimeFormatPartTypes): number => Number(parts.find((item) => item.type === type)?.value ?? "0");
  const wallClockAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return (wallClockAsUtc - utcMillis) / MINUTE;
}

/** NOAA fractional-year equation-of-time model, version-pinned with ZP-1. */
export function equationOfTimeMinutes(utcMillis: number): number {
  const date = new Date(utcMillis);
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((utcMillis - yearStart) / 86_400_000) + 1;
  const hourUtc = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const gamma = ((2 * Math.PI) / 365) * (dayOfYear - 1 + (hourUtc - 12) / 24);
  return 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
}

export interface SolarCorrection { longitudeMinutes: number; equationMinutes: number; totalMinutes: number }

/** True-solar correction: longitude correction plus the version-pinned equation of time. */
export function solarCorrection(timezone: string, longitude: number, birthInstant: string | number): SolarCorrection {
  const utcMillis = typeof birthInstant === "string" ? instantMillisOf(birthInstant) : birthInstant;
  const offsetHours = timezoneOffsetMinutes(timezone, utcMillis) / 60;
  const longitudeMinutes = (longitude - 15 * offsetHours) * 4;
  const equationMinutes = equationOfTimeMinutes(utcMillis);
  return { longitudeMinutes: round2(longitudeMinutes), equationMinutes: round2(equationMinutes), totalMinutes: round2(longitudeMinutes + equationMinutes) };
}

function round2(value: number): number { return Math.round(value * 100) / 100; }

export function shiftLocalDateTime(localDateTime: string, minutes: number): string {
  const base = Date.parse(`${localDateTime}${localDateTime.length === 16 ? ":00" : ""}Z`);
  if (!Number.isFinite(base)) throw new Error(`无效的本地时间: ${localDateTime}`);
  return new Date(base + Math.round(minutes * MINUTE)).toISOString().slice(0, 19);
}

export function dayOf(localDateTime: string): string { return localDateTime.slice(0, 10); }
export function hourOf(localDateTime: string): number { return Number(localDateTime.slice(11, 13)); }

function formatter(timezone: string): Intl.DateTimeFormat {
  let value = formatterCache.get(timezone);
  if (!value) {
    value = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatterCache.set(timezone, value);
  }
  return value;
}

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  const value = parts.find((item) => item.type === type)?.value;
  if (!value) throw new Error(`时区格式化缺少 ${type}`);
  return value;
}

export function isValidTimezone(timezone: string): boolean {
  try {
    formatter(timezone).format(0);
    return true;
  } catch {
    return false;
  }
}

export function offsetText(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const total = Math.abs(offsetMinutes);
  return `${sign}${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function offsetInBirthInstant(value: string): number {
  if (!INSTANT_PATTERN.test(value)) throw new Error("birthInstant 必须包含秒和 UTC 偏移");
  if (value.endsWith("Z")) return 0;
  const sign = value.at(-6) === "+" ? 1 : -1;
  return sign * (Number(value.slice(-5, -3)) * 60 + Number(value.slice(-2)));
}

export function instantMillisOf(value: string): number {
  if (!INSTANT_PATTERN.test(value)) throw new Error("birthInstant 必须是带明确偏移的 ISO-8601 时刻");
  const [date, time] = value.slice(0, 19).split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, second] = time.split(":").map(Number);
  const civil = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (
    civil.getUTCFullYear() !== year || civil.getUTCMonth() !== month - 1 || civil.getUTCDate() !== day ||
    civil.getUTCHours() !== hour || civil.getUTCMinutes() !== minute || civil.getUTCSeconds() !== second
  ) throw new Error("birthInstant 不是有效时刻");
  const result = Date.parse(value);
  if (!Number.isFinite(result)) throw new Error("birthInstant 不是有效时刻");
  return result;
}

export function civilDateTimeOf(timezone: string, instant: string | number): string {
  const millis = typeof instant === "string" ? instantMillisOf(instant) : instant;
  const parts = formatter(timezone).formatToParts(millis);
  return `${part(parts, "year")}-${part(parts, "month")}-${part(parts, "day")}T${part(parts, "hour")}:${part(parts, "minute")}:${part(parts, "second")}`;
}

/** Validates that the provided numeric offset is the IANA historical offset at the same instant. */
export function assertInstantMatchesTimezone(birthInstant: string, timezone: string): void {
  const millis = instantMillisOf(birthInstant);
  const declared = offsetInBirthInstant(birthInstant);
  const actual = timezoneOffsetMinutes(timezone, millis);
  if (declared !== actual) {
    throw new Error(`birthInstant 偏移 ${offsetText(declared)} 与 ${timezone} 在该时刻的历史偏移 ${offsetText(actual)} 不一致`);
  }
}

/**
 * Resolves a local civil clock only for UI entry. It never silently chooses a
 * DST overlap: callers receive all exact candidate instants and must provide
 * the desired offset when more than one exists.
 */
export function instantCandidatesForCivil(timezone: string, localDateTime: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(localDateTime)) {
    throw new Error("当地时间必须为 YYYY-MM-DDTHH:mm:ss");
  }
  const withSeconds = localDateTime.length === 16 ? `${localDateTime}:00` : localDateTime;
  const naive = Date.parse(`${withSeconds}Z`);
  if (!Number.isFinite(naive)) throw new Error("当地时间不是有效日期");
  const offsets = new Set<number>();
  // Scan a full 30-hour window around a possible transition. IANA offsets are
  // minute based; this covers overlap/gap changes including date-line shifts.
  for (let probe = naive - 30 * 60 * MINUTE; probe <= naive + 30 * 60 * MINUTE; probe += 15 * MINUTE) {
    offsets.add(timezoneOffsetMinutes(timezone, probe));
  }
  const candidates = [...offsets]
    .map((offset) => ({ millis: naive - offset * MINUTE, offset }))
    .filter(({ millis }) => civilDateTimeOf(timezone, millis) === withSeconds)
    .sort((a, b) => a.millis - b.millis)
    .map(({ millis, offset }) => `${withSeconds}${offsetText(offset)}`);
  return [...new Set(candidates)];
}

export function birthInstantFromCivil(timezone: string, localDateTime: string, offset?: string): string {
  const candidates = instantCandidatesForCivil(timezone, localDateTime);
  if (candidates.length === 0) throw new Error("该当地时间落在夏令时跳过区间，请更正出生时刻");
  if (offset) {
    const matched = candidates.find((candidate) => candidate.endsWith(offset));
    if (!matched) throw new Error("所选 UTC 偏移不适用于该当地时间和时区");
    return matched;
  }
  if (candidates.length > 1) throw new Error(`该当地时间在夏令时重复区间，请选择 UTC 偏移：${candidates.map((candidate) => candidate.slice(-6)).join(" / ")}`);
  return candidates[0];
}

export function shiftCivilDateTime(localDateTime: string, seconds: number): string {
  const base = Date.parse(`${localDateTime}Z`);
  if (!Number.isFinite(base)) throw new Error("无效当地时间");
  return new Date(base + seconds * SECOND).toISOString().slice(0, 19);
}
