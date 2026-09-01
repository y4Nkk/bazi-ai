import { afterEach, describe, expect, it } from "vitest";
import { invokeAnalysis, AiInvocationError, parseAndValidate } from "../src/ai/invoke";
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
  favorableElements: ["土", "金"],
  selectedPeriod: {
    resolution: "day",
    dimension: "overall",
    timestamp: "2026-08-15",
    open: 54,
    high: 67,
    low: 54,
    close: 57,
    reasons: [{ id: "ZHI_LIUHE:午未|流年|流年|原局", code: "ZHI_LIUHE:午未", label: "地支六合", polarity: "support", direction: 1, temporalLayer: "流年", domainRelevance: ["overall", "relationship"], subjects: ["流年", "原局"] }],
  },
  boundaryChanged: false,
  boundaryAcknowledged: false,
};

const KEY = "sk-SECRET-KEY-FOR-TEST-1234";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("provider invocation", () => {
  it("rejects an AI citation that is absent from the deterministic selection", () => {
    const output = {
      evidenceStatus: "cited",
      summary: "这是一段长度足够的整体解读，且只按已给定的传统规则说明当前周期。",
      summaryRuleIds: ["forged-rule"],
      dimensionInterpretations: [{ dimension: "career", interpretation: "事业层面保持审慎推进，避免把短期信号当成确定结果。", ruleIds: ["forged-rule"] }],
      opportunities: ["维持既有节奏"],
      cautions: ["避免过度承诺"],
      selectedPeriod: { explanation: "所选周期只反映确定性引擎的规则组合，不代表现实事件或任何结果保证。", ruleIds: ["forged-rule"] },
      disclaimer: "本解读属于传统文化与娱乐性质，不构成任何现实决策依据。",
    };
    expect(() => parseAndValidate(JSON.stringify(output), SELECTION)).toThrow("不存在的规则");
  });

  it("never echoes provider response bodies that contain key fragments", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          error: { message: `Incorrect API key provided: ${KEY}` },
        }),
        { status: 401 },
      )) as typeof fetch;

    const error = await invokeAnalysis({
      provider: "openai",
      model: "gpt-5.6-luna",
      apiKey: KEY,
      selection: SELECTION,
    }).catch((e: unknown) => e as AiInvocationError);

    expect(error).toBeInstanceOf(AiInvocationError);
    expect((error as AiInvocationError).code).toBe("PROVIDER_ERROR");
    expect((error as AiInvocationError).message).not.toContain(KEY);
    expect((error as AiInvocationError).message).not.toContain("Incorrect API key");
    expect((error as AiInvocationError).message).toContain("401");
  });

  it("maps non-JSON model output to INVALID_OUTPUT", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "这不是 JSON" } }],
        }),
        { status: 200 },
      )) as typeof fetch;

    const error = await invokeAnalysis({
      provider: "openai",
      model: "gpt-5.6-luna",
      apiKey: KEY,
      selection: SELECTION,
    }).catch((e: unknown) => e as AiInvocationError);

    expect(error).toBeInstanceOf(AiInvocationError);
    expect((error as AiInvocationError).code).toBe("INVALID_OUTPUT");
  });
});
