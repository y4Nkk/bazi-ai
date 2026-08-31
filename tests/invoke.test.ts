import { afterEach, describe, expect, it } from "vitest";
import { invokeAnalysis, AiInvocationError } from "../src/ai/invoke";
import type { AnalyzeSelection } from "../src/ai/schema";

const SELECTION: AnalyzeSelection = {
  snapshotKey: "0123456789abcdef",
  engineVersion: "1.0.0",
  scoringProfileVersion: "scoring-v1",
  chartGender: "male",
  timeStandard: "civil",
  natalPillars: ["庚午", "辛巳", "庚辰", "癸未"],
  dayMaster: "庚",
  dayMasterElement: "金",
  luckDirection: "顺行",
  selectedPeriod: {
    resolution: "day",
    dimension: "overall",
    timestamp: "2026-08-15",
    open: 54,
    high: 67,
    low: 54,
    close: 57,
    factors: ["ZHI_LIUHE:午未"],
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
      model: "gpt-4o-mini",
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
      model: "gpt-4o-mini",
      apiKey: KEY,
      selection: SELECTION,
    }).catch((e: unknown) => e as AiInvocationError);

    expect(error).toBeInstanceOf(AiInvocationError);
    expect((error as AiInvocationError).code).toBe("INVALID_OUTPUT");
  });
});
