import { describe, expect, it } from "vitest";
import { DIMENSION_KEYS, type RuleHit } from "../src/domain/bazi/contract";
import { projectTemporal } from "../src/domain/bazi/projection";
import type { TemporalJudgment } from "../src/domain/bazi/temporal";

function ruleHit(index: number): RuleHit {
  return {
    id: `ADVERSE_ELEMENT:${index}|流年|流年|火`,
    code: "ADVERSE_ELEMENT:火",
    label: "忌神五行",
    polarity: "pressure",
    direction: -1,
    severity: 3,
    temporalLayer: "流年",
    domainRelevance: ["overall"],
    subjects: ["流年", "火"],
  };
}

function judgmentWith(evidence: RuleHit[]): TemporalJudgment {
  const verdicts = {} as TemporalJudgment["verdicts"];
  for (const domain of DIMENSION_KEYS) {
    verdicts[domain] = {
      domain,
      tendency: "neutral",
      intensity: "weak",
      confidence: "low",
      evidenceFor: [],
      evidenceAgainst: [],
      evidenceContext: [],
      ruleIds: [],
      activePeriods: [],
    };
  }
  return {
    transit: { year: "丙午", month: "丁酉", day: "戊子", hour: "己丑", luck: "庚寅" },
    evidence,
    verdicts,
  };
}

describe("layer-normalized projection", () => {
  it("does not drive an index to the lower bound merely because one layer has many rules", () => {
    const score = projectTemporal(judgmentWith(Array.from({ length: 24 }, (_, index) => ruleHit(index)))).scores.overall;
    expect(score).toBe(22);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(50);
  });
});
