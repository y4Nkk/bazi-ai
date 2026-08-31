import { describe, expect, it } from "vitest";
import { calculateBaziSnapshot } from "../src/domain/bazi/snapshot";
import { parseWorkbenchCache } from "../src/lib/workbench-cache";
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

function cacheFor(value: BirthInput = input) {
  const snapshot = calculateBaziSnapshot({
    input: value,
    range: { start: "2026-08-01", end: "2026-08-01" },
    dimension: "overall",
    resolution: "day",
  });
  return { input: value, snapshot, selectedCandle: 0, analysisOutput: null };
}

describe("workbench cache contract", () => {
  it("accepts a snapshot paired with its exact normalized input", () => {
    expect(parseWorkbenchCache(cacheFor())?.input).toEqual(input);
  });

  it("rejects a same-version snapshot paired with another birth input", () => {
    const cache = cacheFor();
    cache.snapshot.input = { ...cache.snapshot.input, longitude: 116.41 };
    expect(parseWorkbenchCache(cache)).toBeNull();
  });

  it("rejects a cache input that omits required display latitude", () => {
    const cache = cacheFor() as { input: Record<string, unknown> };
    delete cache.input.latitude;
    expect(parseWorkbenchCache(cache)).toBeNull();
  });
});
