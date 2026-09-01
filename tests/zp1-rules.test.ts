import { describe, expect, it } from "vitest";
import { natalChartOf } from "../src/domain/bazi/natal";
import { assessQi } from "../src/domain/bazi/qi";
import { assessStructure } from "../src/domain/bazi/structure";
import { resolveFavorable } from "../src/domain/bazi/favorable";
import { evaluateTransit } from "../src/domain/bazi/projection";
import { ruleHitsFromRelations, temporalRelationsOf } from "../src/domain/bazi/relations";
import { natalRelationsOf } from "../src/domain/bazi/relations";
import type { BirthInput } from "../src/domain/bazi/normalize";

const input: BirthInput = {
  birthInstant: "1990-05-15T14:00:00+09:00",
  chartGender: "male",
  timezone: "Asia/Shanghai",
  longitude: 121.47,
  latitude: 31.23,
  timeStandard: "civil",
};

describe("ZP-1 natal judgment", () => {
  it("derives one primary structure, qi evidence, and a closed favorable-element policy", () => {
    const natal = natalChartOf("1990-05-15T14:00:00");
    const qi = assessQi(natal);
    const relations = natalRelationsOf(natal);
    const judgment = resolveFavorable(natal, qi, assessStructure(natal, qi, relations), relations);
    expect(judgment.primaryStructure).toBe("七杀格");
    expect(qi.evidence.some((reason) => reason.code === "QI_MONTH_COMMAND")).toBe(true);
    expect(natal.annotations.every((annotation) => annotation.code.startsWith("SHENSHA_"))).toBe(true);
    expect(qi.evidence.some((reason) => reason.code.startsWith("SHENSHA_"))).toBe(false);
    expect(natal.roots.every((root) => ["residual", "middle", "main", "prosperous"].includes(root.grade))).toBe(true);
    expect(judgment.favorableElements.length).toBeGreaterThan(0);
    expect(judgment.adverseElements.some((element) => judgment.favorableElements.includes(element))).toBe(false);
  });
});

describe("ZP-1 temporal rules", () => {
  it("keeps rule evidence source-labelled and includes the active luck pillar", () => {
    const natal = natalChartOf("1990-05-15T14:00:00");
    const qi = assessQi(natal);
    const relations = natalRelationsOf(natal);
    const judgment = resolveFavorable(natal, qi, assessStructure(natal, qi, relations), relations);
    const transit = { year: "丙午", month: "甲午", day: "庚子", hour: "丙子", luck: "壬申" } as const;
    const hits = ruleHitsFromRelations(temporalRelationsOf(natal, transit));
    expect(hits.some((reason) => reason.subjects.includes("大运"))).toBe(true);
    expect(hits.every((reason) => reason.code && reason.label && reason.subjects.length > 0)).toBe(true);
    const result = evaluateTransit(input, natal, judgment, transit);
    expect(result.scores.overall).toBeGreaterThanOrEqual(0);
    expect(result.scores.overall).toBeLessThanOrEqual(100);
    expect(new Set(result.reasons.map((reason) => `${reason.code}|${reason.temporalLayer}|${reason.subjects.join("|")}`)).size)
      .toBe(result.reasons.length);
  });

  it("projects a different period when the active luck pillar changes", () => {
    const natal = natalChartOf("1990-05-15T14:00:00");
    const qi = assessQi(natal);
    const relations = natalRelationsOf(natal);
    const judgment = resolveFavorable(natal, qi, assessStructure(natal, qi, relations), relations);
    const base = { year: "丙午", month: "甲午", day: "庚子", hour: "丙子" };
    const withLuck = evaluateTransit(input, natal, judgment, { ...base, luck: "戊辰" });
    const withoutLuck = evaluateTransit(input, natal, judgment, { ...base, luck: null });
    expect(withLuck.reasons.some((reason) => reason.subjects.includes("大运"))).toBe(true);
    expect(withLuck.scores).not.toEqual(withoutLuck.scores);
  });
});
