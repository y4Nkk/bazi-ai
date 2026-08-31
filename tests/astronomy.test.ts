import { describe, expect, it } from "vitest";
import {
  assertInstantMatchesTimezone,
  birthInstantFromCivil,
  civilDateTimeOf,
  instantCandidatesForCivil,
} from "../src/domain/bazi/astronomy";

describe("unique civil-time resolution", () => {
  it("keeps a normal IANA civil time as one offset-bearing instant", () => {
    // Shanghai observed DST in May 1990, so IANA must win over a present-day
    // assumption of UTC+08:00.
    expect(birthInstantFromCivil("Asia/Shanghai", "1990-05-15T14:00")).toBe("1990-05-15T14:00:00+09:00");
    expect(civilDateTimeOf("Asia/Shanghai", "1990-05-15T14:00:00+09:00")).toBe("1990-05-15T14:00:00");
  });

  it("does not silently choose either side of a DST overlap", () => {
    const candidates = instantCandidatesForCivil("America/New_York", "2024-11-03T01:30");
    expect(candidates).toEqual(["2024-11-03T01:30:00-04:00", "2024-11-03T01:30:00-05:00"]);
    expect(() => birthInstantFromCivil("America/New_York", "2024-11-03T01:30")).toThrow("选择 UTC 偏移");
    expect(birthInstantFromCivil("America/New_York", "2024-11-03T01:30", "-05:00")).toBe(candidates[1]);
  });

  it("rejects a DST gap and an offset that does not belong to the IANA instant", () => {
    expect(instantCandidatesForCivil("America/New_York", "2024-03-10T02:30")).toEqual([]);
    expect(() => assertInstantMatchesTimezone("2024-06-01T12:00:00+09:00", "Asia/Shanghai")).toThrow("历史偏移");
  });
});
