import { describe, expect, it } from "vitest";
import { calculateBaziSnapshot } from "../src/domain/bazi/snapshot";
import { professionalDetailOf } from "../src/domain/bazi/professional";

describe("professional-detail deterministic contract", () => {
  it("carries the selected period endpoint and complete moving pillars into the detail view", () => {
    const snapshot = calculateBaziSnapshot({
      input: {
        birthInstant: "1990-05-15T14:00:00+08:00",
        chartGender: "male",
        timezone: "Asia/Shanghai",
        longitude: 121.47,
        latitude: 31.23,
        timeStandard: "civil",
      },
      range: { start: "2024-02-04", end: "2024-02-04" },
      dimension: "overall",
      resolution: "day",
    });
    const period = snapshot.series.periods[0];
    const detail = professionalDetailOf(snapshot, period);

    expect(period.kind).toBe("candle");
    expect(detail.endpointInstant).toBe(period.kind === "candle" ? period.closeInstant : period.instant);
    expect(detail.natalPillars.map((pillar) => pillar.label)).toEqual(["年柱", "月柱", "日柱", "时柱"]);
    expect(detail.temporalPillars.map((pillar) => pillar.label)).toEqual(["大运", "流年", "流月", "流日", "流时"]);
    expect(detail.temporalPillars.every((pillar) => pillar.hiddenStemFacts.length > 0)).toBe(true);
    expect(detail.temporalPillars.every((pillar) => Array.isArray(pillar.shensha))).toBe(true);
  });

  it("never promotes shensha annotations into period evidence or projection", () => {
    const snapshot = calculateBaziSnapshot({
      input: {
        birthInstant: "1990-05-15T14:00:00+08:00",
        chartGender: "male",
        timezone: "Asia/Shanghai",
        longitude: 121.47,
        latitude: 31.23,
        timeStandard: "civil",
      },
      range: { start: "2024-02-04", end: "2024-02-04" },
      dimension: "overall",
      resolution: "shichen",
    });

    expect(snapshot.natal.annotations.length).toBeGreaterThan(0);
    expect(snapshot.series.periods.every((period) => period.reasons.every((hit) => !hit.code.startsWith("SHENSHA_")))).toBe(true);
  });
});
