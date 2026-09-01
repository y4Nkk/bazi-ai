import { describe, expect, it } from "vitest";
import { AnalysisOutputSchema, AnalyzeSelectionSchema, selectionFromSnapshot } from "../src/ai/schema";
import { parseAndValidate, AiInvocationError } from "../src/ai/invoke";
import { buildSystemPrompt, buildUserPrompt } from "../src/ai/prompt";
import type { AnalyzeSelection } from "../src/ai/schema";
import { calculateBaziSnapshot } from "../src/domain/bazi/snapshot";
import type { RuleHit } from "../src/domain/bazi/contract";

const VALID_OUTPUT = {
  evidenceStatus: "cited" as const,
  summary: "这是一段长度足够的整体解读，说明命盘结构与当前周期的关系，语气平和。",
  summaryRuleIds: ["ZHI_LIUHE:午未|流年|流年|原局"],
  dimensionInterpretations: [
    { dimension: "career", interpretation: "事业层面受官星与印星共同影响，稳中有进。", ruleIds: ["ZHI_LIUHE:午未|流年|流年|原局"] },
    { dimension: "wealth", interpretation: "财星得地，适合稳健经营，不宜冒进。", ruleIds: ["ZHI_LIUHE:午未|流年|流年|原局"] },
  ],
  opportunities: ["顺势巩固专业能力", "维持既有合作关系"],
  cautions: ["避免过度承诺", "注意节奏与休息"],
  selectedPeriod: {
    explanation:
      "所选周期的指数由引擎给出，主要受地支六合与三合因子推动，整体温和向上，属于平稳期。",
    ruleIds: ["ZHI_LIUHE:午未|流年|流年|原局"],
  },
  disclaimer: "本解读属于传统文化与娱乐性质，不构成任何现实决策依据。",
};

const VALID_SELECTION: AnalyzeSelection = {
  snapshotKey: "0123456789abcdef",
  algorithmVersion: "zp-1.0.0",
  chartGender: "male",
  timeStandard: "civil",
  natalPillars: ["庚午", "辛巳", "庚辰", "癸未"],
  dayMaster: "庚",
  dayMasterElement: "金",
  luckDirection: "顺行",
  primaryStructure: "七杀格",
  favorableElements: ["土", "金"],
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
      reasons: [{ id: "ZHI_LIUHE:午未|流年|流年|原局", code: "ZHI_LIUHE:午未", label: "地支六合", polarity: "support", direction: 1, temporalLayer: "流年", domainRelevance: ["overall", "relationship"] }],
    },
  },
  boundaryChanged: false,
  boundaryAcknowledged: false,
};

describe("AnalysisOutput schema", () => {
  it("accepts a well-formed output", () => {
    expect(AnalysisOutputSchema.safeParse(VALID_OUTPUT).success).toBe(true);
  });

  it("rejects an output that injects numeric scores", () => {
    const result = AnalysisOutputSchema.safeParse({ ...VALID_OUTPUT, scores: { overall: 88 } });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields and requires citations for cited output", () => {
    expect(AnalysisOutputSchema.safeParse({ ...VALID_OUTPUT, summary: "" }).success).toBe(false);
    expect(
      AnalysisOutputSchema.safeParse({ ...VALID_OUTPUT, summaryRuleIds: [], dimensionInterpretations: [], selectedPeriod: { ...VALID_OUTPUT.selectedPeriod, ruleIds: [] } }).success,
    ).toBe(false);
    expect(AnalysisOutputSchema.safeParse({ ...VALID_OUTPUT, disclaimer: "短" }).success).toBe(false);
  });

  it("accepts an explicit no-evidence explanation without invented citations", () => {
    const output = {
      ...VALID_OUTPUT,
      evidenceStatus: "insufficient" as const,
      summary: "当前规则无法确定该周期是否存在足以支持具体判断的确定性依据，因此仅保留这一边界说明。",
      summaryRuleIds: [],
      dimensionInterpretations: [],
      opportunities: [],
      cautions: [],
      selectedPeriod: {
        explanation: "当前规则无法确定该周期的具体倾向，因为没有可引用的确定性规则依据。",
        ruleIds: [],
      },
    };
    expect(AnalysisOutputSchema.safeParse(output).success).toBe(true);
  });

  it("rejects duplicate dimension interpretations", () => {
    const duplicated = {
      ...VALID_OUTPUT,
      dimensionInterpretations: [VALID_OUTPUT.dimensionInterpretations[0], VALID_OUTPUT.dimensionInterpretations[0]],
    };
    expect(AnalysisOutputSchema.safeParse(duplicated).success).toBe(false);
  });

  it("accepts citing every rule the selected period can carry", () => {
    const reasons = Array.from({ length: 24 }, (_, index) => ({
      id: `RULE_${index}|流年|流年|原局`,
      code: `RULE_${index}`,
      label: `规则${index}`,
      polarity: "support",
      direction: 1,
      temporalLayer: "流年",
      domainRelevance: ["overall"],
    }));
    const selection = AnalyzeSelectionSchema.parse({
      ...VALID_SELECTION,
      selectedPeriod: {
        ...VALID_SELECTION.selectedPeriod,
        period: { ...VALID_SELECTION.selectedPeriod.period, reasons },
      },
    });
    const ids = reasons.map((reason) => reason.id);
    const output = {
      ...VALID_OUTPUT,
      summaryRuleIds: ids,
      dimensionInterpretations: [{ dimension: "career", interpretation: "事业层面受多项确定性规则共同影响，宜稳步推进。", ruleIds: ids }],
      selectedPeriod: { explanation: VALID_OUTPUT.selectedPeriod.explanation, ruleIds: ids },
    };
    expect(AnalysisOutputSchema.safeParse(output).success).toBe(true);
    expect(parseAndValidate(JSON.stringify(output), selection).summaryRuleIds).toHaveLength(24);
  });
});

describe("AnalyzeSelection schema", () => {
  it("accepts a valid selection", () => {
    expect(AnalyzeSelectionSchema.safeParse(VALID_SELECTION).success).toBe(true);
  });

  it("rejects internal relationship subjects from the AI request", () => {
    const result = AnalyzeSelectionSchema.safeParse({
      ...VALID_SELECTION,
      selectedPeriod: {
        ...VALID_SELECTION.selectedPeriod,
        period: {
          ...VALID_SELECTION.selectedPeriod.period,
          reasons: [{
            ...VALID_SELECTION.selectedPeriod.period.reasons[0],
            subjects: ["流时", "大运", "甲午", "己亥", "午冲子", "亥冲巳"],
          }],
        },
      },
    });
    expect(result.success).toBe(false);
  });

  it("does not project internal relationship subjects into the model prompt", () => {
    const snapshot = calculateBaziSnapshot({
      input: {
        birthInstant: "1990-05-15T14:00:00+09:00",
        chartGender: "male",
        timezone: "Asia/Shanghai",
        longitude: 121.47,
        latitude: 31.23,
        timeStandard: "civil",
      },
      range: { start: "2026-08-01", end: "2026-08-01" },
      dimension: "overall",
      resolution: "day",
    });
    const internalRelation: RuleHit = {
      id: "INTERNAL_RELATION",
      code: "INTERNAL_RELATION",
      label: "内部关系",
      polarity: "support",
      direction: 1,
      severity: 3,
      temporalLayer: "流年",
      domainRelevance: ["overall"],
      subjects: ["只留在确定性引擎的完整关系主体"],
    };
    const selection = selectionFromSnapshot({
      ...snapshot,
      series: {
        ...snapshot.series,
        periods: [{ ...snapshot.series.periods[0], reasons: [internalRelation] }],
      },
    }, snapshot.series.periods[0].id, false);

    expect(selection.selectedPeriod.period.reasons[0]).not.toHaveProperty("subjects");
    expect(buildUserPrompt(selection)).not.toContain("只留在确定性引擎的完整关系主体");
  });

  it("allows a name as salutation metadata only", () => {
    const selection = { ...VALID_SELECTION, subjectName: "王小明" };
    expect(AnalyzeSelectionSchema.safeParse(selection).success).toBe(true);
    expect(buildUserPrompt(selection)).toContain("命主称呼：王小明（仅用于称呼，不是排盘或判断依据）");
  });

  it("accepts an atomic shichen selection without fabricating OHLC and labels it honestly in the prompt", () => {
    const atomic: AnalyzeSelection = {
      ...VALID_SELECTION,
      selectedPeriod: {
        resolution: "shichen",
        dimension: "overall",
        period: {
          kind: "point",
          timestamp: "2026-08-15T23:00",
          instant: "2026-08-15T23:00:00+08:00",
          value: 57,
          reasons: [],
        },
      },
    };
    expect(AnalyzeSelectionSchema.safeParse(atomic).success).toBe(true);
    const prompt = buildUserPrompt(atomic);
    expect(prompt).toContain("时辰命势值");
    expect(prompt).not.toContain("开 57");
  });

  it("rejects the removed dual-version fields and legacy reason list", () => {
    expect(AnalyzeSelectionSchema.safeParse({
      ...VALID_SELECTION,
      engineVersion: "1.0.0",
      scoringProfileVersion: "legacy",
    }).success).toBe(false);
  });

  it("requires boundary acknowledgement when the boundary changed", () => {
    const result = AnalyzeSelectionSchema.safeParse({
      ...VALID_SELECTION,
      boundaryChanged: true,
      boundaryAcknowledged: false,
    });
    expect(result.success).toBe(false);
  });

  it("accepts an acknowledged boundary change", () => {
    const result = AnalyzeSelectionSchema.safeParse({
      ...VALID_SELECTION,
      boundaryChanged: true,
      boundaryAcknowledged: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("model text parsing", () => {
  it("accepts fenced JSON and validates it", () => {
    const fenced = "```json\n" + JSON.stringify(VALID_OUTPUT) + "\n```";
    const parsed = parseAndValidate(fenced);
    expect(parsed.summary).toBe(VALID_OUTPUT.summary);
  });

  it("rejects non-JSON text", () => {
    expect(() => parseAndValidate("这是一段普通的文字")).toThrow(AiInvocationError);
  });

  it("rejects JSON that fails the schema", () => {
    expect(() => parseAndValidate(JSON.stringify({ hello: "world" }))).toThrow(AiInvocationError);
  });

  it("accepts evidence-insufficient output only when the selected period has no rule", () => {
    const noEvidence = {
      ...VALID_OUTPUT,
      evidenceStatus: "insufficient" as const,
      summary: "当前规则无法确定该周期的具体传统命理倾向，因此不补充未经规则支持的解释。",
      summaryRuleIds: [],
      dimensionInterpretations: [],
      opportunities: [],
      cautions: [],
      selectedPeriod: { explanation: "当前规则无法确定该周期的具体倾向，因为引擎没有提供可引用规则。", ruleIds: [] },
    };
    const emptySelection = {
      ...VALID_SELECTION,
      selectedPeriod: {
        ...VALID_SELECTION.selectedPeriod,
        period: { ...VALID_SELECTION.selectedPeriod.period, reasons: [] },
      },
    };
    expect(parseAndValidate(JSON.stringify(noEvidence), emptySelection)).toEqual(noEvidence);
    expect(() => parseAndValidate(JSON.stringify(noEvidence), VALID_SELECTION)).toThrow("不得以证据不足替代引用");
  });
});

describe("prompt construction", () => {
  it("embeds deterministic facts and forbids invented numbers", () => {
    const system = buildSystemPrompt();
    const user = buildUserPrompt(VALID_SELECTION, "今年事业如何？");
    expect(system).toContain("绝不计算、修改或新造任何数字");
    expect(system).toContain("传统文化与娱乐性质");
    expect(user).toContain("庚午 辛巳 庚辰 癸未");
    expect(user).toContain("ZHI_LIUHE:午未");
    expect(user).toContain("地支六合");
    expect(user).toContain("今年事业如何？");
  });
});
