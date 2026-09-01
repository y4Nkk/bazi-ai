import { describe, expect, it } from "vitest";
import { calculateBaziSnapshot } from "../src/domain/bazi/snapshot";
import {
  HISTORY_LIMIT,
  parseWorkbenchHistory,
  upsertWorkbenchHistory,
  type WorkbenchCache,
} from "../src/lib/workbench-cache";
import { AnalysisOutputSchema, type AnalysisOutput } from "../src/ai/schema";
import type { BirthInput } from "../src/domain/bazi/normalize";

const input: BirthInput = {
  subjectName: "王小明",
  birthplace: "上海",
  birthInstant: "1990-05-15T14:00:00+09:00",
  chartGender: "male",
  timezone: "Asia/Shanghai",
  longitude: 121.47,
  latitude: 31.23,
  timeStandard: "civil",
};

const aiOutput: AnalysisOutput = {
  evidenceStatus: "insufficient",
  summary: "当前规则无法确定该周期的具体倾向，因此不对未被确定性证据支持的内容作出判断。",
  summaryRuleIds: [],
  dimensionInterpretations: [],
  opportunities: ["先核对当前周期的确定性因素"],
  cautions: ["不要将文化娱乐解读当作现实决策依据"],
  selectedPeriod: {
    explanation: "当前规则无法确定该周期的具体倾向，因为所选周期没有可引用的确定性规则依据。",
    ruleIds: [],
  },
  disclaimer: "本解读属于传统文化与娱乐性质，不构成现实决策依据。",
};

function cacheFor(value: BirthInput = input): WorkbenchCache {
  const cacheInput = { ...value };
  const snapshot = calculateBaziSnapshot({
    input: cacheInput,
    range: { start: "2026-08-01", end: "2026-08-01" },
    dimension: "overall",
    resolution: "day",
  });
  const selectedPeriodId = snapshot.series.periods[0]?.id;
  if (!selectedPeriodId) throw new Error("fixture did not produce a selectable period");
  return { input: cacheInput, snapshot, selectedPeriodId, analysisOutput: null };
}

function historyRecord(id = "record-1", updatedAt = "2026-09-01T08:00:00.000Z") {
  return {
    ...cacheFor(),
    id,
    createdAt: "2026-09-01T07:00:00.000Z",
    updatedAt,
  };
}

describe("workbench history contract", () => {
  it("accepts a complete record paired with its exact normalized input", () => {
    expect(parseWorkbenchHistory({ records: [historyRecord()] })?.[0].input).toEqual(input);
  });

  it("rejects a same-version snapshot paired with another birth input", () => {
    const record = historyRecord();
    record.snapshot.input = { ...record.snapshot.input, longitude: 116.41 };
    expect(parseWorkbenchHistory({ records: [record] })).toBeNull();
  });

  it("rejects the obsolete single-result payload and malformed records", () => {
    const missingLatitude = historyRecord() as { input: Record<string, unknown> };
    delete missingLatitude.input.latitude;
    expect(parseWorkbenchHistory(cacheFor())).toBeNull();
    expect(parseWorkbenchHistory({ records: [missingLatitude] })).toBeNull();
  });

  it("preserves a validated AI reading for history replay", () => {
    const record = historyRecord();
    record.analysisOutput = aiOutput;
    expect(AnalysisOutputSchema.safeParse(aiOutput).success).toBe(true);
    const parsed = parseWorkbenchHistory({ records: [record] });
    expect(parsed).not.toBeNull();
    expect(parsed?.[0]?.analysisOutput).toEqual(aiOutput);
  });

  it("updates one record in place and keeps only the most recent records", () => {
    const first = historyRecord();
    const refreshed = upsertWorkbenchHistory(
      [first],
      first.id,
      cacheFor(),
      "2026-09-01T09:00:00.000Z",
    );
    expect(refreshed).toHaveLength(1);
    expect(refreshed[0]?.createdAt).toBe(first.createdAt);
    expect(refreshed[0]?.updatedAt).toBe("2026-09-01T09:00:00.000Z");

    const records = Array.from({ length: HISTORY_LIMIT }, (_, index) =>
      historyRecord(`record-${index}`, `2026-09-01T0${index}:00:00.000Z`),
    );
    expect(
      upsertWorkbenchHistory(records, "record-new", cacheFor(), "2026-09-01T12:00:00.000Z"),
    ).toHaveLength(HISTORY_LIMIT);
  });
});
