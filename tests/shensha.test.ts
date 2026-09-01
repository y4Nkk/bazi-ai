import { describe, expect, it } from "vitest";
import { natalChartOf } from "../src/domain/bazi/natal";
import { shenshaForGanzhi, type ShenshaContext } from "../src/domain/bazi/shensha";

const context: ShenshaContext = {
  dayStem: "甲",
  dayBranch: "寅",
  monthBranch: "寅",
  yearBranch: "子",
  voidBranches: ["戌", "亥"],
};

describe("closed shensha annotation catalog", () => {
  it("matches independent day-stem, month-branch, day-branch, and year-branch lookups", () => {
    const labels = shenshaForGanzhi(context, "丁卯").map((fact) => fact.label);

    expect(labels).toContain("天德贵人");
    expect(labels).toContain("桃花");
    expect(labels).toContain("红鸾");
  });

  it("keeps void and branch-group annotations traceable to their natal references", () => {
    const facts = shenshaForGanzhi(context, "辛亥");

    expect(facts).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "SHENSHA_JIE_SHA", label: "劫煞", reference: "日支寅", target: "亥" }),
      expect.objectContaining({ code: "SHENSHA_KONG_WANG", label: "空亡", target: "亥" }),
    ]));
  });

  it("derives stable auxiliary pillars from the same selected natal chart", () => {
    const natal = natalChartOf("1990-05-15T14:00:00");

    expect(natal.pillars.map((pillar) => pillar.ganzhi)).toEqual(["庚午", "辛巳", "庚辰", "癸未"]);
    expect(natal.auxiliaryPillars.map(({ name, ganzhi }) => [name, ganzhi])).toEqual([
      ["胎元", "壬申"],
      ["胎息", "乙酉"],
      ["命宫", "辛巳"],
      ["身宫", "己丑"],
    ]);
    expect(natal.pillars.every((pillar) => Array.isArray(pillar.shensha))).toBe(true);
  });
});
