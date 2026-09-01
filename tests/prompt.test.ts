import { describe, expect, it } from "vitest";
import { buildUserPrompt } from "../src/ai/prompt";
import type { AnalyzeSelection } from "../src/ai/schema";

const SELECTION: AnalyzeSelection = {
  snapshotKey: "0123456789abcdef",
  algorithmVersion: "zp-1.0.0",
  chartGender: "male",
  timeStandard: "civil",
  natalPillars: ["庚午", "辛巳", "庚辰", "癸未"],
  dayMaster: "庚",
  dayMasterElement: "金",
  luckDirection: "顺行",
  primaryStructure: "七杀格",
  climate: {
    clauseId: "qtb:庚:巳:base",
    primaryStems: ["壬"],
    secondaryStems: ["戊", "丙"],
    matchedConditions: ["月令基础条款"],
    source: { work: "《穷通宝鉴》", section: "论庚金·三夏庚金·4月庚金", locator: "4月条" },
  },
  elementDirectives: [
    { element: "水", rank: 1, sources: ["climatePrimary"] },
    { element: "土", rank: 2, sources: ["climateSecondary"] },
  ],
  selectedPeriod: {
    resolution: "day",
    dimension: "overall",
    period: {
      kind: "candle",
      timestamp: "2026-08-15",
      open: 54,
      high: 67,
      low: 54,
      close: 57,
      reasons: [],
    },
  },
  boundaryChanged: false,
  boundaryAcknowledged: false,
};

describe("user prompt output contract", () => {
  it("pins every list field's element type in both evidence branches", () => {
    const cited: AnalyzeSelection = {
      ...SELECTION,
      selectedPeriod: {
        ...SELECTION.selectedPeriod,
        period: {
          ...SELECTION.selectedPeriod.period,
          reasons: [{
            id: "ZHI_LIUHE:午未|流年|流年|原局",
            code: "ZHI_LIUHE:午未",
            label: "地支六合",
            polarity: "support",
            direction: 1,
            temporalLayer: "流年",
            domainRelevance: ["overall", "relationship"],
          }],
        },
      },
    };
    for (const prompt of [buildUserPrompt(SELECTION), buildUserPrompt(cited)]) {
      expect(prompt).toContain("opportunities（字符串数组");
      expect(prompt).toContain("cautions（字符串数组");
      expect(prompt).toContain("summaryRuleIds（字符串数组");
    }
  });
});
