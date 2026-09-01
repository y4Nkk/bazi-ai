import { describe, expect, it } from "vitest";
import { natalChartOf } from "../src/domain/bazi/natal";
import { assessQi } from "../src/domain/bazi/qi";
import { QIONGTONG_CLIMATE_RULES, qiongTongClimateOf } from "../src/domain/bazi/qiong-tong-climate";
import { natalRelationsOf } from "../src/domain/bazi/relations";
import { resolveFavorable } from "../src/domain/bazi/favorable";
import { assessStructure } from "../src/domain/bazi/structure";

describe("穷通宝鉴调候合同", () => {
  it("freezes every day-master × month-command base clause with source evidence", () => {
    expect(QIONGTONG_CLIMATE_RULES).toHaveLength(120);
    expect(new Set(QIONGTONG_CLIMATE_RULES.map((rule) => `${rule.dayStem}${rule.monthBranch}`)).size).toBe(120);
    for (const rule of QIONGTONG_CLIMATE_RULES) {
      expect(rule.primary.length).toBeGreaterThan(0);
      expect(rule.source.work).toBe("《穷通宝鉴》");
      expect(rule.source.url).toContain("wikisource.org");
    }
  });

  it("derives primary and secondary directives from the exact natal day-master and month command", () => {
    const natal = natalChartOf("1990-05-15T14:00:00");
    const qi = assessQi(natal);
    const climate = qiongTongClimateOf(natal, qi);
    expect(climate.dayMaster).toBe("庚");
    expect(climate.monthBranch).toBe("巳");
    expect(climate.primaryStems).toEqual(["壬"]);
    expect(climate.secondaryStems).toEqual(["戊", "丙"]);
    expect(climate.clauseId).toBe("qtb:庚:巳:base");
    const relations = natalRelationsOf(natal);
    const judgment = resolveFavorable(natal, qi, assessStructure(natal, qi, relations), relations);
    expect(judgment.elementDirectives).toContainEqual(expect.objectContaining({ element: "水", rank: 1, sources: expect.arrayContaining(["climatePrimary"]) }));
    expect(judgment.elementDirectives).toContainEqual(expect.objectContaining({ element: "土", rank: 2, sources: expect.arrayContaining(["climateSecondary"]) }));
  });

  it("replaces a base clause only when its explicit seasonal condition is met", () => {
    const seed = natalChartOf("1990-05-15T14:00:00");
    const afterSummerSolstice = {
      ...seed,
      dayMaster: { ...seed.dayMaster, stem: "乙" },
      pillars: seed.pillars.map((pillar, index) => index === 1 ? { ...pillar, branch: "午" } : pillar),
      seasonalQi: "夏至",
    };
    const climate = qiongTongClimateOf(afterSummerSolstice, assessQi(afterSummerSolstice));
    expect(climate.clauseId).toBe("qtb:乙:午:after-summer-solstice");
    expect(climate.primaryStems).toEqual(["丙"]);
    expect(climate.secondaryStems).toEqual(["癸"]);
  });
});
