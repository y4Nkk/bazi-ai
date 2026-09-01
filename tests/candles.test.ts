import { describe, expect, it } from "vitest";
import { calculateBaziSnapshot } from "../src/domain/bazi/snapshot";
import type { BirthInput } from "../src/domain/bazi/normalize";
import type { Candle } from "../src/domain/bazi/contract";

const KNOWN_INPUT: BirthInput = {
  birthInstant: "1990-05-15T14:00:00+09:00",
  chartGender: "male",
  timezone: "Asia/Shanghai",
  longitude: 121.47,
  latitude: 31.23,
  timeStandard: "civil",
};

const ohlcOk = (candle: Candle): boolean =>
  candle.low <= Math.min(candle.open, candle.close) &&
  Math.max(candle.open, candle.close) <= candle.high;

describe("known birth fixture", () => {
  it("returns stable pillars and day master", () => {
    const snapshot = calculateBaziSnapshot({
      input: KNOWN_INPUT,
      range: { start: "2026-08-01", end: "2026-08-31" },
      dimension: "overall",
      resolution: "day",
    });
    expect(snapshot.civilCandidate.pillars).toEqual(["庚午", "辛巳", "庚辰", "癸未"]);
    expect(snapshot.natal.dayMaster.stem).toBe("庚");
    expect(snapshot.natal.dayMaster.element).toBe("金");
    expect(snapshot.civilCandidate.shichen).toBe("未");
    expect(snapshot.algorithmVersion).toMatch(/^zp-1\.4\.0-[0-9a-f]{8}-noaa-eot-2006-lunar-typescript-1\.8\.6-cst-instant-v2$/);
    expect(snapshot.judgment.primaryStructure).toBeTruthy();
    expect(snapshot.snapshotKey).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe("candle aggregation invariants", () => {
  it.each([
      ["day", { start: "2026-01-01", end: "2026-03-01" }],
      ["month", { start: "2026-01-01", end: "2027-12-31" }],
      ["year", { start: "2026-01-01", end: "2027-12-31" }],
    ] as const)("keeps OHLC invariants at %s resolution", (resolution, range) => {
      const snapshot = calculateBaziSnapshot({
        input: KNOWN_INPUT,
        range,
        dimension: "overall",
        resolution,
      });
      expect(snapshot.series.candles.length).toBeGreaterThan(0);
      for (const candle of snapshot.series.candles) {
        expect(ohlcOk(candle), `${resolution} ${candle.timestamp}`).toBe(true);
        expect(candle.intensity).toBe(Math.abs(candle.close - candle.open));
      }
    });

  it("daily candles agree with their twelve shichen points", () => {
    const snapshot = calculateBaziSnapshot({
      input: KNOWN_INPUT,
      range: { start: "2026-08-01", end: "2026-08-07" },
      dimension: "wealth",
      resolution: "day",
    });
    const points = snapshot.series.underlyingPoints;
    expect(points).toHaveLength(7 * 12);
    snapshot.series.candles.forEach((candle, dayIndex) => {
      const dayValues = points.slice(dayIndex * 12, dayIndex * 12 + 12).map((p) => p.scores.wealth);
      expect(candle.open).toBe(dayValues[0]);
      expect(candle.close).toBe(dayValues[11]);
      expect(candle.high).toBe(Math.max(...dayValues));
      expect(candle.low).toBe(Math.min(...dayValues));
    });
  });

  it("monthly candles agree with the daily candles inside each month", () => {
    const dailyCandles: Candle[] = [];
    for (const monthStart of ["2026-08-01", "2026-09-01", "2026-10-01"]) {
      const dailySnapshot = calculateBaziSnapshot({
        input: KNOWN_INPUT,
        range: { start: monthStart, end: monthStart.slice(0, 7) === "2026-08" ? "2026-08-31" : monthStart.slice(0, 7) === "2026-09" ? "2026-09-30" : "2026-10-31" },
        dimension: "overall",
        resolution: "day",
      });
      dailyCandles.push(...dailySnapshot.series.candles);
    }
    const monthlySnapshot = calculateBaziSnapshot({
      input: KNOWN_INPUT,
      range: { start: "2026-08-01", end: "2026-10-31" },
      dimension: "overall",
      resolution: "month",
    });
    const byMonth = new Map<string, Candle[]>();
    for (const candle of dailyCandles) {
      const key = candle.timestamp.slice(0, 7);
      const bucket = byMonth.get(key) ?? [];
      bucket.push(candle);
      byMonth.set(key, bucket);
    }
    expect(monthlySnapshot.series.candles).toHaveLength(3);
    for (const monthCandle of monthlySnapshot.series.candles) {
      const bucket = byMonth.get(monthCandle.timestamp) as Candle[];
      expect(monthCandle.open).toBe(bucket[0].open);
      expect(monthCandle.close).toBe(bucket[bucket.length - 1].close);
      expect(monthCandle.high).toBe(Math.max(...bucket.map((c) => c.high)));
      expect(monthCandle.low).toBe(Math.min(...bucket.map((c) => c.low)));
    }
  });
});

describe("determinism and cache-key contract", () => {
  it("returns identical snapshots for identical requests", () => {
    const args = {
      input: KNOWN_INPUT,
      range: { start: "2026-08-01", end: "2026-08-31" },
      dimension: "overall" as const,
      resolution: "day" as const,
    };
    const first = calculateBaziSnapshot(args);
    const second = calculateBaziSnapshot(args);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("includes the time standard in the snapshot key and output", () => {
    const civil = calculateBaziSnapshot({
      input: KNOWN_INPUT,
      range: { start: "2026-08-01", end: "2026-08-31" },
      dimension: "overall",
      resolution: "day",
    });
    const solar = calculateBaziSnapshot({
      input: { ...KNOWN_INPUT, timeStandard: "trueSolar" },
      range: { start: "2026-08-01", end: "2026-08-31" },
      dimension: "overall",
      resolution: "day",
    });
    expect(civil.snapshotKey).not.toBe(solar.snapshotKey);
    expect(civil.selectedStandard).toBe("civil");
    expect(solar.selectedStandard).toBe("trueSolar");
  });

  it("keeps display metadata out of the deterministic snapshot key and series", () => {
    const anonymous = calculateBaziSnapshot({
      input: KNOWN_INPUT,
      range: { start: "2026-08-01", end: "2026-08-31" },
      dimension: "overall",
      resolution: "day",
    });
    const named = calculateBaziSnapshot({
      input: { ...KNOWN_INPUT, subjectName: "王小明", birthplace: "上海", latitude: 39.9 },
      range: { start: "2026-08-01", end: "2026-08-31" },
      dimension: "overall",
      resolution: "day",
    });
    expect(named.snapshotKey).toBe(anonymous.snapshotKey);
    expect(named.series).toEqual(anonymous.series);
    expect(named.input.subjectName).toBe("王小明");
    expect(named.input.birthplace).toBe("上海");
    expect(named.input.latitude).toBe(39.9);
  });
});
