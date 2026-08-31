import { describe, expect, it } from "vitest";
import { luckInfoOf } from "../src/domain/bazi/luck";

describe("luck-cycle direction", () => {
  it("runs forward for a yang-year male and backward for a yin-year male", () => {
    // 1984 甲子 (yang stem 甲), 1985 乙丑 (yin stem 乙).
    const yangMale = luckInfoOf("1984-06-01T10:00", "male");
    const yinMale = luckInfoOf("1985-06-01T10:00", "male");
    expect(yangMale.forward).toBe(true);
    expect(yangMale.directionLabel).toBe("顺行");
    expect(yinMale.forward).toBe(false);
    expect(yinMale.directionLabel).toBe("逆行");
  });

  it("runs backward for a yang-year female and forward for a yin-year female", () => {
    expect(luckInfoOf("1984-06-01T10:00", "female").forward).toBe(false);
    expect(luckInfoOf("1985-06-01T10:00", "female").forward).toBe(true);
  });

  it("orders consecutive cycle pillars along the direction", () => {
    const forward = luckInfoOf("1984-06-01T10:00", "male");
    const pillars = forward.cycles
      .filter((cycle) => cycle.ganzhi)
      .map((cycle) => cycle.ganzhi as string);
    expect(pillars.length).toBeGreaterThanOrEqual(9);
    expect(pillars[0]).toBe("庚午");
    expect(pillars[1]).toBe("辛未");
    const backward = luckInfoOf("1984-06-01T10:00", "female");
    const backPillars = backward.cycles
      .filter((cycle) => cycle.ganzhi)
      .map((cycle) => cycle.ganzhi as string);
    expect(backPillars[0]).toBe("戊辰");
    expect(backPillars[1]).toBe("丁卯");
  });

  it("reports the start moment deterministically", () => {
    const info = luckInfoOf("1984-06-01T10:00", "male");
    expect(info.startDateTime).toBe("1985-11-21T10:00");
  });
});
