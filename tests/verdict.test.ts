import { describe, expect, it } from "vitest";
import { natalChartOf } from "../src/domain/bazi/natal";
import { assessQi } from "../src/domain/bazi/qi";
import { natalRelationsOf } from "../src/domain/bazi/relations";
import { assessStructure } from "../src/domain/bazi/structure";
import { resolveFavorable } from "../src/domain/bazi/favorable";
import { calculateBaziSnapshot } from "../src/domain/bazi/snapshot";
import { verdictsOf } from "../src/domain/bazi/verdict";

describe("domain-verdict evidence contract", () => {
  it("marks an evidence-free domain as undetermined instead of emitting empty trace data", () => {
    const natal = natalChartOf("1990-05-15T14:00:00");
    const qi = assessQi(natal);
    const relations = natalRelationsOf(natal);
    const judgment = resolveFavorable(natal, qi, assessStructure(natal, qi, relations), relations);
    const verdicts = verdictsOf({
      input: {
        birthInstant: "1990-05-15T14:00:00+09:00",
        chartGender: "male",
        timezone: "Asia/Shanghai",
        longitude: 121.47,
        latitude: 31.23,
        timeStandard: "civil",
      },
      natal,
      judgment,
      evidence: [],
    });

    for (const verdict of Object.values(verdicts)) {
      expect(verdict.tendency).toBe("neutral");
      expect(verdict.ruleIds).toEqual([`INSUFFICIENT_EVIDENCE|原局|${verdict.domain}`]);
      expect(verdict.evidenceContext.map((hit) => hit.code)).toEqual(["INSUFFICIENT_EVIDENCE"]);
      expect(verdict.activePeriods).toEqual(["原局"]);
    }
  });

  it("keeps every published snapshot verdict traceable to at least one rule and layer", () => {
    const snapshot = calculateBaziSnapshot({
      input: {
        birthInstant: "1990-05-15T14:00:00+09:00",
        chartGender: "male",
        timezone: "Asia/Shanghai",
        longitude: 121.47,
        latitude: 31.23,
        timeStandard: "civil",
      },
      range: { start: "2024-06-01", end: "2024-06-01" },
      dimension: "overall",
      resolution: "day",
    });
    for (const verdict of Object.values(snapshot.verdicts)) {
      expect(verdict.ruleIds.length).toBeGreaterThan(0);
      expect(verdict.activePeriods.length).toBeGreaterThan(0);
    }
  });

  it("carries an adjudicated natal relation into the natal judgment and domain verdicts", () => {
    const natal = natalChartOf("1983-12-15T12:00:00");
    const relations = natalRelationsOf(natal);
    const qi = assessQi(natal, relations);
    const judgment = resolveFavorable(natal, qi, assessStructure(natal, qi, relations), relations);
    const relationId = judgment.evidence.find((hit) => hit.code.startsWith("RELATION_BROKEN:ZHI_LIUHE:子丑"))?.id;
    const verdicts = verdictsOf({
      input: {
        birthInstant: "1983-12-15T12:00:00+08:00",
        chartGender: "male",
        timezone: "Asia/Shanghai",
        longitude: 121.47,
        latitude: 31.23,
        timeStandard: "civil",
      },
      natal,
      judgment,
      evidence: judgment.evidence,
    });
    expect(relationId).toBeTruthy();
    expect(verdicts.relationship.ruleIds).toContain(relationId);
  });
});
