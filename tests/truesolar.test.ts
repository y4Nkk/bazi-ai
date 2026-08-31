import { describe, expect, it } from "vitest";
import {
  equationOfTimeMinutes,
  localDateTimeToUtcMillis,
  shiftLocalDateTime,
  solarCorrection,
  timezoneOffsetMinutes,
} from "../src/domain/bazi/truesolar";
import { buildChartSnapshot } from "../src/domain/fortune/snapshot";

describe("timezone conversion", () => {
  it("returns +480 for Asia/Shanghai and handles DST for America/New_York", () => {
    expect(timezoneOffsetMinutes("Asia/Shanghai", Date.UTC(2024, 5, 1))).toBe(480);
    expect(timezoneOffsetMinutes("America/New_York", Date.UTC(2024, 6, 1))).toBe(-240);
    expect(timezoneOffsetMinutes("America/New_York", Date.UTC(2024, 0, 15))).toBe(-300);
  });

  it("round-trips a local wall clock to UTC milliseconds", () => {
    const utc = localDateTimeToUtcMillis("Asia/Shanghai", "2024-06-01T12:00");
    expect(new Date(utc).toISOString()).toBe("2024-06-01T04:00:00.000Z");
  });
});

describe("equation of time", () => {
  it("is near +16 minutes in early November and near −14 in mid February", () => {
    const november = equationOfTimeMinutes(Date.UTC(2024, 10, 3, 0, 0));
    const february = equationOfTimeMinutes(Date.UTC(2024, 1, 12, 0, 0));
    expect(november).toBeGreaterThan(14);
    expect(november).toBeLessThan(18);
    expect(february).toBeLessThan(-12);
    expect(february).toBeGreaterThan(-16);
  });
});

describe("shift and correction", () => {
  it("shifts across midnight and formats deterministically", () => {
    expect(shiftLocalDateTime("2024-06-01T00:30", -127)).toBe("2024-05-31T22:23");
    expect(shiftLocalDateTime("2024-06-01T12:30", 65)).toBe("2024-06-01T13:35");
  });

  it("computes the Urumqi longitude correction (about −128 minutes)", () => {
    const correction = solarCorrection("Asia/Shanghai", 87.62, "2024-06-01T12:30");
    expect(correction.longitudeMinutes).toBeCloseTo(-129.52, 1);
    expect(correction.totalMinutes).toBeLessThan(-125);
    expect(correction.totalMinutes).toBeGreaterThan(-132);
  });
});

describe("true-solar boundary crossing fixture", () => {
  // Urumqi 87.62°E on the Asia/Shanghai clock: about −127 minutes correction.
  const base = {
    calendar: "gregorian" as const,
    chartGender: "male" as const,
    timezone: "Asia/Shanghai",
    birthplace: "乌鲁木齐",
    longitude: 87.62,
    latitude: 43.79,
    timeStandard: "trueSolar" as const,
  };

  it("flags a shichen change at civil 12:30 (午 → 巳)", () => {
    const snapshot = buildChartSnapshot({
      input: { ...base, localDateTime: "2024-06-01T12:30" },
      range: { start: "2024-06-01", end: "2024-06-30" },
      dimension: "overall",
      resolution: "day",
    });
    expect(snapshot.boundary).not.toBeNull();
    expect(snapshot.boundary?.changedShichen).toBe(true);
    expect(snapshot.boundary?.changedDay).toBe(false);
    expect(snapshot.boundary?.civilShichen).toBe("午");
    expect(snapshot.boundary?.trueSolarShichen).toBe("巳");
  });

  it("flags a day change at civil 00:30 and shows both candidates", () => {
    const snapshot = buildChartSnapshot({
      input: { ...base, localDateTime: "2024-06-01T00:30" },
      range: { start: "2024-06-01", end: "2024-06-30" },
      dimension: "overall",
      resolution: "day",
    });
    expect(snapshot.boundary?.changedDay).toBe(true);
    expect(snapshot.boundary?.civilDay).toBe("2024-06-01");
    expect(snapshot.boundary?.trueSolarDay).toBe("2024-05-31");
    expect(snapshot.civilCandidate.localDateTime).toBe("2024-06-01T00:30");
    expect(snapshot.trueSolarCandidate.localDateTime.startsWith("2024-05-31T")).toBe(true);
  });

  it("uses the selected standard consistently for the natal chart", () => {
    const snapshot = buildChartSnapshot({
      input: { ...base, localDateTime: "2024-06-01T00:30" },
      range: { start: "2024-06-01", end: "2024-06-30" },
      dimension: "overall",
      resolution: "day",
    });
    expect(snapshot.natal.pillars.map((p) => p.ganzhi)).toEqual(
      snapshot.trueSolarCandidate.pillars,
    );
  });
});
