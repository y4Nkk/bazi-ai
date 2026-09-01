import { describe, expect, it } from "vitest";
import { calculateBaziSnapshot } from "../src/domain/bazi/snapshot";
import type { BirthInput } from "../src/domain/bazi/normalize";
import type { Candle, TrendPeriod, TrendPoint } from "../src/domain/bazi/contract";

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

function candlesOf(periods: TrendPeriod[]): Candle[] {
  expect(periods.every((period) => period.kind === "candle")).toBe(true);
  return periods as Candle[];
}

function valueOf(period: TrendPeriod): number {
  return period.kind === "point" ? period.value : period.close;
}

describe("known birth fixture", () => {
  it("returns stable pillars and day master", () => {
    const snapshot = calculateBaziSnapshot({
      input: KNOWN_INPUT,
      range: { start: "2026-08-01", end: "2026-08-07" },
      dimension: "overall",
      resolution: "day",
    });
    expect(snapshot.civilCandidate.pillars).toEqual(["庚午", "辛巳", "庚辰", "癸未"]);
    expect(snapshot.natal.dayMaster.stem).toBe("庚");
    expect(snapshot.natal.dayMaster.element).toBe("金");
    expect(snapshot.civilCandidate.shichen).toBe("未");
    expect(snapshot.algorithmVersion).toMatch(/^zp-1\.\d+\.\d+-[0-9a-f]{8}-noaa-eot-2006-lunar-typescript-1\.8\.6-cst-instant-v2$/);
    expect(snapshot.judgment.primaryStructure).toBeTruthy();
    expect(snapshot.snapshotKey).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe("evidence-chart period contract", () => {
  it("returns direct shichen points with no fabricated OHLC fields", () => {
    const snapshot = calculateBaziSnapshot({
      input: KNOWN_INPUT,
      range: { start: "2026-08-01", end: "2026-08-01" },
      dimension: "wealth",
      resolution: "shichen",
    });

    expect(snapshot.series.periods).toHaveLength(12);
    for (const period of snapshot.series.periods) {
      expect(period.kind).toBe("point");
      if (period.kind !== "point") continue;
      expect(period.id).toBe(`shichen:${period.instant}`);
      expect(period.value).toBeGreaterThanOrEqual(0);
      expect(period.value).toBeLessThanOrEqual(100);
      expect(period).not.toHaveProperty("open");
      expect(period).not.toHaveProperty("high");
      expect(period).not.toHaveProperty("low");
      expect(period).not.toHaveProperty("close");
    }
  });

  it("uses exact offset-bearing shichen IDs through a DST overlap", () => {
    const snapshot = calculateBaziSnapshot({
      input: {
        birthInstant: "1990-05-15T14:00:00-04:00",
        chartGender: "male",
        timezone: "America/New_York",
        longitude: -74.006,
        latitude: 40.7128,
        timeStandard: "civil",
      },
      range: { start: "2024-11-03", end: "2024-11-03" },
      dimension: "overall",
      resolution: "shichen",
    });
    const overlap = snapshot.series.periods.filter(
      (period): period is TrendPoint => period.kind === "point" && period.timestamp === "2024-11-03T01:00",
    );

    expect(overlap).toHaveLength(2);
    expect(new Set(overlap.map((period) => period.id)).size).toBe(2);
    expect(new Set(overlap.map((period) => period.instant)).size).toBe(2);
  });

  it("keeps aggregate OHLC invariants and canonical period IDs at every aggregate grain", () => {
    for (const [resolution, range] of [
      ["day", { start: "2026-01-01", end: "2026-03-01" }],
      ["month", { start: "2026-01-01", end: "2026-03-31" }],
      ["year", { start: "2026-01-01", end: "2026-02-28" }],
    ] as const) {
      const snapshot = calculateBaziSnapshot({ input: KNOWN_INPUT, range, dimension: "overall", resolution });
      const candles = candlesOf(snapshot.series.periods);
      expect(candles.length).toBeGreaterThan(0);
      expect(new Set(candles.map((candle) => candle.id)).size).toBe(candles.length);
      for (const candle of candles) {
        expect(candle.id).toBe(`${resolution}:${candle.timestamp}`);
        expect(ohlcOk(candle), `${resolution} ${candle.timestamp}`).toBe(true);
      }
    }
  });

  it("derives daily OHLC from each day’s direct shichen evidence", () => {
    const range = { start: "2026-08-01", end: "2026-08-07" };
    const shichen = calculateBaziSnapshot({ input: KNOWN_INPUT, range, dimension: "wealth", resolution: "shichen" });
    const daily = calculateBaziSnapshot({ input: KNOWN_INPUT, range, dimension: "wealth", resolution: "day" });
    const points = shichen.series.periods.filter((period) => period.kind === "point");
    const dailyCandles = candlesOf(daily.series.periods);

    expect(points).toHaveLength(7 * 12);
    dailyCandles.forEach((candle, dayIndex) => {
      const values = points.slice(dayIndex * 12, dayIndex * 12 + 12).map((point) => point.value);
      expect(candle.open).toBe(values[0]);
      expect(candle.close).toBe(values[values.length - 1]);
      expect(candle.high).toBe(Math.max(...values));
      expect(candle.low).toBe(Math.min(...values));
    });
  });

  it("derives monthly and yearly OHLC from their immediate aggregate grain", () => {
    const dayRange = { start: "2026-01-01", end: "2026-02-28" };
    const daily = candlesOf(calculateBaziSnapshot({ input: KNOWN_INPUT, range: dayRange, dimension: "overall", resolution: "day" }).series.periods);
    const monthly = candlesOf(calculateBaziSnapshot({ input: KNOWN_INPUT, range: dayRange, dimension: "overall", resolution: "month" }).series.periods);

    for (const candle of monthly) {
      const source = daily.filter((period) => period.timestamp.startsWith(candle.timestamp));
      expect(candle.open).toBe(source[0].open);
      expect(candle.close).toBe(source[source.length - 1].close);
      expect(candle.high).toBe(Math.max(...source.map((period) => period.high)));
      expect(candle.low).toBe(Math.min(...source.map((period) => period.low)));
    }

    const yearRange = dayRange;
    const yearSourceMonths = candlesOf(calculateBaziSnapshot({ input: KNOWN_INPUT, range: yearRange, dimension: "overall", resolution: "month" }).series.periods);
    const yearly = candlesOf(calculateBaziSnapshot({ input: KNOWN_INPUT, range: yearRange, dimension: "overall", resolution: "year" }).series.periods);
    for (const candle of yearly) {
      const source = yearSourceMonths.filter((period) => period.timestamp.startsWith(candle.timestamp));
      expect(candle.open).toBe(source[0].open);
      expect(candle.close).toBe(source[source.length - 1].close);
      expect(candle.high).toBe(Math.max(...source.map((period) => period.high)));
      expect(candle.low).toBe(Math.min(...source.map((period) => period.low)));
    }
  });

  it("ships aligned domain-owned 命势中轴 and 变势强度 values", () => {
    const snapshot = calculateBaziSnapshot({
      input: KNOWN_INPUT,
      range: { start: "2026-08-01", end: "2026-08-03" },
      dimension: "overall",
      resolution: "shichen",
    });
    const { periods, indicators } = snapshot.series;
    const values = periods.map(valueOf);

    expect(indicators.trendCenterWindow).toBe(5);
    expect(indicators.trendCenter).toHaveLength(periods.length);
    expect(indicators.intensity).toHaveLength(periods.length);
    expect(indicators.intensity[0]).toBe(0);
    for (let index = 1; index < periods.length; index += 1) {
      expect(periods[index].intensity).toBe(Math.abs(values[index] - values[index - 1]));
      expect(indicators.intensity[index]).toBe(periods[index].intensity);
      const window = values.slice(Math.max(0, index - 4), index + 1);
      expect(indicators.trendCenter[index]).toBe(Math.round((window.reduce((sum, value) => sum + value, 0) / window.length) * 10) / 10);
    }
  });
});

describe("determinism and cache-key contract", () => {
  it("returns identical snapshots for identical requests", () => {
    const args = {
      input: KNOWN_INPUT,
      range: { start: "2026-08-01", end: "2026-08-07" },
      dimension: "overall" as const,
      resolution: "shichen" as const,
    };
    const first = calculateBaziSnapshot(args);
    const second = calculateBaziSnapshot(args);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("includes the time standard and chart resolution in snapshot identity", () => {
    const common = { range: { start: "2026-08-01", end: "2026-08-01" }, dimension: "overall" as const };
    const civil = calculateBaziSnapshot({ input: KNOWN_INPUT, ...common, resolution: "day" });
    const solar = calculateBaziSnapshot({ input: { ...KNOWN_INPUT, timeStandard: "trueSolar" }, ...common, resolution: "day" });
    const shichen = calculateBaziSnapshot({ input: KNOWN_INPUT, ...common, resolution: "shichen" });

    expect(civil.snapshotKey).not.toBe(solar.snapshotKey);
    expect(civil.snapshotKey).not.toBe(shichen.snapshotKey);
    expect(civil.selectedStandard).toBe("civil");
    expect(solar.selectedStandard).toBe("trueSolar");
  });

  it("keeps display metadata out of the deterministic snapshot key and series", () => {
    const args = { range: { start: "2026-08-01", end: "2026-08-01" }, dimension: "overall" as const, resolution: "shichen" as const };
    const anonymous = calculateBaziSnapshot({ input: KNOWN_INPUT, ...args });
    const named = calculateBaziSnapshot({
      input: { ...KNOWN_INPUT, subjectName: "王小明", birthplace: "上海", latitude: 39.9 },
      ...args,
    });
    expect(named.snapshotKey).toBe(anonymous.snapshotKey);
    expect(named.series).toEqual(anonymous.series);
    expect(named.input.subjectName).toBe("王小明");
    expect(named.input.birthplace).toBe("上海");
    expect(named.input.latitude).toBe(39.9);
  });
});
