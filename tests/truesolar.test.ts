import { describe, expect, it } from "vitest";
import {
  equationOfTimeMinutes,
  shiftLocalDateTime,
  solarCorrection,
  timezoneOffsetMinutes,
} from "../src/domain/bazi/astronomy";
import { calculateBaziSnapshot } from "../src/domain/bazi/snapshot";

describe("timezone conversion", () => {
  it("returns +480 for Asia/Shanghai and handles DST for America/New_York", () => {
    expect(timezoneOffsetMinutes("Asia/Shanghai", Date.UTC(2024, 5, 1))).toBe(480);
    expect(timezoneOffsetMinutes("America/New_York", Date.UTC(2024, 6, 1))).toBe(-240);
    expect(timezoneOffsetMinutes("America/New_York", Date.UTC(2024, 0, 15))).toBe(-300);
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
    expect(shiftLocalDateTime("2024-06-01T00:30", -127)).toBe("2024-05-31T22:23:00");
    expect(shiftLocalDateTime("2024-06-01T12:30", 65)).toBe("2024-06-01T13:35:00");
  });

  it("computes the Urumqi longitude correction (about −128 minutes)", () => {
    const correction = solarCorrection("Asia/Shanghai", 87.62, "2024-06-01T12:30:00+08:00");
    expect(correction.longitudeMinutes).toBeCloseTo(-129.52, 1);
    expect(correction.totalMinutes).toBeLessThan(-125);
    expect(correction.totalMinutes).toBeGreaterThan(-132);
  });

  it("uses the chosen instant instead of re-resolving a DST-overlap wall clock", () => {
    const daylight = solarCorrection("America/New_York", -74.006, "2024-11-03T01:00:00-04:00");
    const standard = solarCorrection("America/New_York", -74.006, "2024-11-03T01:00:00-05:00");
    expect(daylight.totalMinutes - standard.totalMinutes).toBeLessThan(-59);
    expect(daylight.totalMinutes - standard.totalMinutes).toBeGreaterThan(-61);
  });
});

describe("true-solar boundary crossing fixture", () => {
  // Urumqi 87.62°E on the Asia/Shanghai clock: about −127 minutes correction.
  const base = {
    chartGender: "male" as const,
    timezone: "Asia/Shanghai",
    longitude: 87.62,
    latitude: 43.83,
    timeStandard: "trueSolar" as const,
  };

  it("flags a shichen change at civil 12:30 (午 → 巳)", () => {
    const snapshot = calculateBaziSnapshot({
      input: { ...base, birthInstant: "2024-06-01T12:30:00+08:00" },
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
    const snapshot = calculateBaziSnapshot({
      input: { ...base, birthInstant: "2024-06-01T00:30:00+08:00" },
      range: { start: "2024-06-01", end: "2024-06-30" },
      dimension: "overall",
      resolution: "day",
    });
    expect(snapshot.boundary?.changedDay).toBe(true);
    expect(snapshot.boundary?.civilDay).toBe("2024-06-01");
    expect(snapshot.boundary?.trueSolarDay).toBe("2024-05-31");
    expect(snapshot.civilCandidate.localDateTime).toBe("2024-06-01T00:30:00");
    expect(snapshot.trueSolarCandidate.localDateTime.startsWith("2024-05-31T")).toBe(true);
  });

  it("uses the selected standard consistently for the natal chart", () => {
    const snapshot = calculateBaziSnapshot({
      input: { ...base, birthInstant: "2024-06-01T00:30:00+08:00" },
      range: { start: "2024-06-01", end: "2024-06-30" },
      dimension: "overall",
      resolution: "day",
    });
    expect(snapshot.natal.pillars.map((p) => p.ganzhi)).toEqual(
      snapshot.trueSolarCandidate.pillars,
    );
  });

  it("keeps both real instants for a true-solar DST-overlap shichen", () => {
    const snapshot = calculateBaziSnapshot({
      input: {
        chartGender: "male",
        timezone: "America/New_York",
        longitude: -74.006,
        latitude: 40.713,
        timeStandard: "trueSolar",
        birthInstant: "2024-11-03T01:30:00-05:00",
      },
      range: { start: "2024-11-03", end: "2024-11-03" },
      dimension: "overall",
      resolution: "day",
    });
    expect(snapshot.series.underlyingPoints).toHaveLength(13);
    expect(new Set(snapshot.series.underlyingPoints.map((point) => point.timestamp)).size).toBe(12);
  });

  it("keeps civil-day endpoints aligned after a DST-overlap day", () => {
    const snapshot = calculateBaziSnapshot({
      input: {
        chartGender: "male",
        timezone: "America/New_York",
        longitude: -74.006,
        latitude: 40.713,
        timeStandard: "trueSolar",
        birthInstant: "2024-11-03T01:30:00-05:00",
      },
      range: { start: "2024-11-02", end: "2024-11-04" },
      dimension: "overall",
      resolution: "month",
    });
    expect(snapshot.series.underlyingPoints.map((point) => point.timestamp)).toEqual([
      "2024-11-02T21:00",
      "2024-11-03T21:00",
      "2024-11-04T21:00",
    ]);
  });

  it("does not fabricate a candle for an IANA-skipped civil day", () => {
    const snapshot = calculateBaziSnapshot({
      input: {
        chartGender: "male",
        timezone: "Pacific/Apia",
        longitude: -171.75,
        latitude: -13.83,
        timeStandard: "trueSolar",
        birthInstant: "2011-12-29T12:00:00-10:00",
      },
      range: { start: "2011-12-29", end: "2011-12-31" },
      dimension: "overall",
      resolution: "day",
    });
    expect(snapshot.series.candles.map((candle) => candle.timestamp)).toEqual(["2011-12-29", "2011-12-31"]);
  });
});
