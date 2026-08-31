/**
 * Timezone and true-solar-time conversion. All functions are deterministic:
 * they depend only on their arguments and the fixed ICU timezone database.
 */

const MINUTE = 60_000;

const offsetFormatterCache = new Map<string, Intl.DateTimeFormat>();

function offsetFormatter(timezone: string): Intl.DateTimeFormat {
  let formatter = offsetFormatterCache.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    offsetFormatterCache.set(timezone, formatter);
  }
  return formatter;
}

/** UTC offset of the timezone at the given instant, in minutes east of UTC. */
export function timezoneOffsetMinutes(timezone: string, utcMillis: number): number {
  const parts = offsetFormatter(timezone).formatToParts(utcMillis);
  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  const wallClockAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return (wallClockAsUtc - utcMillis) / MINUTE;
}

/**
 * Converts a local wall clock in the timezone to UTC milliseconds. During a
 * DST gap the earlier offset wins; the result is stable for equal inputs.
 */
export function localDateTimeToUtcMillis(timezone: string, localDateTime: string): number {
  const guess = Date.parse(`${localDateTime}:00Z`);
  if (Number.isNaN(guess)) {
    throw new Error(`无效的本地时间: ${localDateTime}`);
  }
  const firstOffset = timezoneOffsetMinutes(timezone, guess);
  let utc = guess - firstOffset * MINUTE;
  const secondOffset = timezoneOffsetMinutes(timezone, utc);
  if (secondOffset !== firstOffset) {
    utc = guess - secondOffset * MINUTE;
  }
  return utc;
}

/**
 * Equation of time in minutes (apparent − mean solar time), NOAA fractional
 * year approximation. Accuracy is within ±15 seconds, far below the two-hour
 * shichen granularity.
 */
export function equationOfTimeMinutes(utcMillis: number): number {
  const date = new Date(utcMillis);
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((utcMillis - yearStart) / 86_400_000) + 1;
  const hourUtc = date.getUTCHours() + date.getUTCMinutes() / 60;
  const gamma = ((2 * Math.PI) / 365) * (dayOfYear - 1 + (hourUtc - 12) / 24);
  return (
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma))
  );
}

export interface SolarCorrection {
  /** (longitude − 15 × utc offset hours) × 4 minutes. */
  longitudeMinutes: number;
  equationMinutes: number;
  totalMinutes: number;
}

/** True-solar correction for a local wall clock: solar gains on the zone clock. */
export function solarCorrection(timezone: string, longitude: number, localDateTime: string): SolarCorrection {
  const utcMillis = localDateTimeToUtcMillis(timezone, localDateTime);
  const offsetHours = timezoneOffsetMinutes(timezone, utcMillis) / 60;
  const longitudeMinutes = (longitude - 15 * offsetHours) * 4;
  const equationMinutes = equationOfTimeMinutes(utcMillis);
  const totalMinutes = longitudeMinutes + equationMinutes;
  return {
    longitudeMinutes: round2(longitudeMinutes),
    equationMinutes: round2(equationMinutes),
    totalMinutes: round2(totalMinutes),
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function shiftLocalDateTime(localDateTime: string, minutes: number): string {
  const base = Date.parse(`${localDateTime}:00Z`);
  if (Number.isNaN(base)) {
    throw new Error(`无效的本地时间: ${localDateTime}`);
  }
  const shifted = new Date(base + Math.round(minutes * MINUTE));
  const pad = (n: number, width = 2): string => String(n).padStart(width, "0");
  return (
    `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}` +
    `T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`
  );
}

export function dayOf(localDateTime: string): string {
  return localDateTime.slice(0, 10);
}

export function hourOf(localDateTime: string): number {
  return Number(localDateTime.slice(11, 13));
}
