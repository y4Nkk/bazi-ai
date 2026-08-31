import { describe, expect, it } from "vitest";
import { natalChartOf } from "../src/domain/bazi/natal";
import { assessQi } from "../src/domain/bazi/qi";
import { QI_RULES } from "../src/domain/bazi/rules";
import { ruleHit } from "../src/domain/bazi/rules";
import { verdictsOf } from "../src/domain/bazi/verdict";
import { assessStructure } from "../src/domain/bazi/structure";
import { resolveFavorable } from "../src/domain/bazi/favorable";
import { natalRelationsOf } from "../src/domain/bazi/relations";
import type { RelationEdge } from "../src/domain/bazi/contract";

describe("Qi ledger", () => {
  it("adds each ranked root to the day-master ledger and retains its evidence", () => {
    const natal = natalChartOf("1990-05-15T14:00:00");
    const withRoots = assessQi(natal);
    const withoutRoots = assessQi({ ...natal, roots: [] });
    const rootContribution = natal.roots.reduce(
      (total, root) => total + QI_RULES.root[root.grade],
      0,
    );

    expect(withRoots.elementStrength[natal.dayMaster.element] - withoutRoots.elementStrength[natal.dayMaster.element])
      .toBe(rootContribution);
    expect(withRoots.evidence.filter((hit) => hit.code === "QI_ROOT")).toHaveLength(natal.roots.length);
  });

  it("uses the exact position inside a jie interval as an integer month-command coefficient", () => {
    const natal = natalChartOf("2024-02-05T12:00:00");
    const early = assessQi({ ...natal, seasonalProgressPermille: 0 });
    const late = assessQi({ ...natal, seasonalProgressPermille: 999 });
    const seasonalElement = early.seasonalElement;

    expect(early.elementStrength[seasonalElement] - late.elementStrength[seasonalElement])
      .toBe(QI_RULES.monthCommand.early - QI_RULES.monthCommand.late);
    expect(early.evidence.find((hit) => hit.code === "QI_MONTH_COMMAND")?.subjects).toContain("early");
    expect(late.evidence.find((hit) => hit.code === "QI_MONTH_COMMAND")?.subjects).toContain("late");
  });

  it("deducts a fixed ledger amount when an adjudicated relation disrupts a root", () => {
    const natal = natalChartOf("1990-05-15T14:00:00");
    const root = natal.roots[0];
    const relation: RelationEdge = {
      id: "test-root-break", code: "ZHI_CHONG:辰戌", label: "地支相冲", state: "broken", polarity: "pressure", severity: 3,
      temporalLayer: "原局", subjects: [root.pillar], transformElement: null, blockers: ["辰冲戌"],
    };
    const ordinary = assessQi(natal);
    const disrupted = assessQi(natal, [relation]);
    expect(ordinary.elementStrength[natal.dayMaster.element] - disrupted.elementStrength[natal.dayMaster.element])
      .toBe(QI_RULES.rootDisruption.broken);
    expect(disrupted.evidence.some((hit) => hit.code === "QI_ROOT_DISRUPTED")).toBe(true);
  });

  it("caps a strong temporal conclusion until natal theme, luck, and trigger align", () => {
    const natal = natalChartOf("1990-05-15T14:00:00");
    const qi = assessQi(natal);
    const relations = natalRelationsOf(natal);
    const judgment = resolveFavorable(natal, qi, assessStructure(natal, qi, relations), relations);
    const input = {
      birthInstant: "1990-05-15T14:00:00+09:00",
      chartGender: "male" as const,
      timezone: "Asia/Shanghai",
      longitude: 121.47,
      latitude: 31.23,
      timeStandard: "civil" as const,
    };
    const natalTheme = ruleHit("STRUCTURE", "support", 3, "原局", ["正官格"]);
    const trigger = ruleHit("FAVOURABLE_ELEMENT", "support", 3, "流年", ["流年", "火"]);
    const luck = ruleHit("FAVOURABLE_ELEMENT", "support", 3, "大运", ["大运", "火"]);

    const withoutLuck = verdictsOf({ input, natal, judgment, evidence: [natalTheme, trigger] }).career;
    const aligned = verdictsOf({ input, natal, judgment, evidence: [natalTheme, luck, trigger] }).career;
    expect(withoutLuck.intensity).toBe("moderate");
    expect(aligned.intensity).toBe("extreme");
    expect(aligned.confidence).toBe("high");
  });
});
