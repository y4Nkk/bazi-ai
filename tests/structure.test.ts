import { describe, expect, it } from "vitest";
import { natalChartOf } from "../src/domain/bazi/natal";
import { assessQi } from "../src/domain/bazi/qi";
import { natalRelationsOf } from "../src/domain/bazi/relations";
import { assessStructure } from "../src/domain/bazi/structure";
import { resolveFavorable } from "../src/domain/bazi/favorable";
import { YANG_REN_BRANCH } from "../src/domain/bazi/rules";

describe("structure and favorable precedence", () => {
  it("uses the month-command structure when no strict special structure is established", () => {
    const natal = natalChartOf("1990-05-15T14:00");
    const qi = assessQi(natal);
    const structure = assessStructure(natal, qi, natalRelationsOf(natal));
    const judgment = resolveFavorable(natal, qi, structure, natalRelationsOf(natal));
    expect(structure.primaryStructure).toBe("七杀格");
    expect(judgment.structureAnchor).toBe(`${natal.monthCommand.stem}${natal.monthCommand.tenGod}`);
    expect(judgment.climate.primaryElements.every((element) => judgment.elementDirectives.some((directive) => directive.element === element && directive.rank === 1))).toBe(true);
  });

  it("accepts a special structure only through the strict qi candidate, then changes favorable precedence", () => {
    const natal = natalChartOf("1990-05-15T14:00");
    const qi = { ...assessQi(natal), dayMasterStrength: "extremeWeak" as const, followCandidate: "followWealth" as const };
    const structure = assessStructure(natal, qi, natalRelationsOf(natal));
    const judgment = resolveFavorable(natal, qi, structure, natalRelationsOf(natal));
    expect(structure.primaryStructure).toBe("从财格");
    expect(structure.status).toBe("formed");
    expect(judgment.elementDirectives.some((directive) => directive.element === qi.drainingElements[1] && directive.sources.includes("special"))).toBe(true);
  });

  it("keeps only calendar-derived special structures that pass the stricter gates", () => {
    const cases = [
      ["2018-07-05T12:00", "从强格"],
      // This chart has a visible five-combination but does not satisfy the
      // newly required 月令 + 独相作合 gate, so it returns to its month-command structure.
      ["2018-06-30T12:00", "偏财格"],
      ["2008-01-01T12:00", "伤官格"],
      ["2017-06-24T12:00", "正财格"],
      ["2018-07-10T12:00", "七杀格"],
    ] as const;
    for (const [dateTime, expected] of cases) {
      const candidate = natalChartOf(dateTime);
      const qi = assessQi(candidate);
      expect(assessStructure(candidate, qi, natalRelationsOf(candidate)).primaryStructure).toBe(expected);
    }
  });

  it("derives ordinary impairment and rescue from actual calendar-derived four-pillar samples", () => {
    const impairedNatal = natalChartOf("1900-01-01T12:00:00");
    const impaired = assessStructure(impairedNatal, assessQi(impairedNatal), natalRelationsOf(impairedNatal));
    const rescueNatal = natalChartOf("1900-01-03T12:00:00");
    const rescued = assessStructure(rescueNatal, assessQi(rescueNatal), natalRelationsOf(rescueNatal));

    expect(impaired.primaryStructure).toBe("正印格");
    expect(impaired.status).toBe("impaired");
    expect(rescued.primaryStructure).toBe("正官格");
    expect(rescued.status).toBe("formed");
    expect(rescued.evidence.some((hit) => hit.code === "STRUCTURE_RESCUE")).toBe(true);
  });

  it("matches a classical 正官格 rule through a real calendar-derived four-pillar sample", () => {
    // 《三命通会》卷八 lists 戊寅日壬子时、卯月 as 正官格. 1906-04-04
    // is a civil-calendar instance of those three conditions; this asserts
    // only the rule classification, never the text's life-outcome claims.
    const natal = natalChartOf("1906-04-04T00:00:00");
    expect(natal.pillars.map((pillar) => pillar.ganzhi)).toEqual(["丙午", "辛卯", "戊寅", "壬子"]);
    expect(assessStructure(natal, assessQi(natal), natalRelationsOf(natal)).primaryStructure).toBe("正官格");
  });

  it("marks an ordinary structure impaired when its explicit breaker is exposed", () => {
    const natal = natalChartOf("1990-05-15T14:00");
    const officialNatal = {
      ...natal,
      monthCommand: { ...natal.monthCommand, tenGod: "正官" },
      pillars: natal.pillars.map((pillar, index) => index === 0 ? { ...pillar, stemTenGod: "伤官" } : pillar),
    };
    const qi = assessQi(officialNatal);
    const structure = assessStructure(officialNatal, qi, natalRelationsOf(officialNatal));
    expect(structure.primaryStructure).toBe("正官格");
    expect(structure.status).toBe("impaired");
    expect(structure.evidence.some((hit) => hit.code === "STRUCTURE_IMPAIR")).toBe(true);
  });

  it("records an explicit rescue instead of leaving a broken official structure ambiguous", () => {
    const natal = natalChartOf("1990-05-15T14:00");
    const officialNatal = {
      ...natal,
      monthCommand: { ...natal.monthCommand, tenGod: "正官" },
      pillars: natal.pillars.map((pillar, index) => index === 0
        ? { ...pillar, stemTenGod: "伤官" }
        : index === 3 ? { ...pillar, stemTenGod: "正印" } : pillar),
    };
    const qi = assessQi(officialNatal);
    const structure = assessStructure(officialNatal, qi, natalRelationsOf(officialNatal));
    expect(structure.status).toBe("formed");
    expect(structure.evidence.some((hit) => hit.code === "STRUCTURE_RESCUE")).toBe(true);
  });

  it("distinguishes a month-jie from a true yang-ren month command", () => {
    const natal = natalChartOf("1990-05-15T14:00");
    const monthBranch = YANG_REN_BRANCH[natal.dayMaster.stem as keyof typeof YANG_REN_BRANCH];
    const yangRenNatal = {
      ...natal,
      monthCommand: { ...natal.monthCommand, tenGod: "劫财" },
      pillars: natal.pillars.map((pillar, index) => index === 1 ? { ...pillar, branch: monthBranch } : pillar),
    };
    const qi = assessQi(yangRenNatal);
    const structure = assessStructure(yangRenNatal, qi, natalRelationsOf(yangRenNatal));
    expect(structure.primaryStructure).toBe("羊刃格");
  });
});
