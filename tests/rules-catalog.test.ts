import { describe, expect, it } from "vitest";
import { CHONG, HAI, LIUHE, PO, SANHE, SANHUI, XING, ruleCatalogFingerprint, ruleHit, ruleLabel } from "../src/domain/bazi/rules";
import { EARTHLY_BRANCHES } from "../src/domain/bazi/constants";

describe("frozen relation catalog", () => {
  it("keeps all pair relations symmetric and branch-valid", () => {
    for (const table of [CHONG, LIUHE, HAI, PO]) {
      for (const [left, right] of Object.entries(table)) {
        expect(EARTHLY_BRANCHES).toContain(left);
        expect(EARTHLY_BRANCHES).toContain(right);
        expect(table[right as keyof typeof table]).toBe(left);
      }
    }
  });

  it("keeps each three-branch formation distinct and each punishment branch-valid", () => {
    for (const group of [...SANHE, ...SANHUI]) {
      expect(new Set(group).size).toBe(3);
      group.forEach((branch) => expect(EARTHLY_BRANCHES).toContain(branch));
    }
    for (const pair of XING) [...pair].forEach((branch) => expect(EARTHLY_BRANCHES).toContain(branch));
  });

  it("has a stable catalog fingerprint", () => {
    expect(ruleCatalogFingerprint()).toMatch(/^[0-9a-f]{8}$/);
  });

  it("emits numeric projection direction and closed domain relevance with each rule hit", () => {
    const qi = ruleHit("QI_ROOT", "support", 2, "原局", ["day"]);
    const clash = ruleHit("ZHI_CHONG:子午", "pressure", 3, "流年", ["流年", "原局"]);
    expect(qi.direction).toBe(1);
    expect(qi.domainRelevance).toContain("health");
    expect(clash.direction).toBe(-1);
    expect(clash.domainRelevance).toContain("mobility");
  });

  it("rejects a rule code with no catalog label instead of silently rendering it", () => {
    expect(() => ruleLabel("NOT_A_ZP_RULE:example")).toThrow("规则目录缺少标签");
    expect(ruleHit("ZHI_GONGHE:寅午戌", "context", 1, "原局", ["寅", "戌"]).domainRelevance).toContain("relationship");
  });
});
