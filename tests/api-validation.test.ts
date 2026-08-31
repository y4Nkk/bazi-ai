import { describe, expect, it } from "vitest";
import { BirthInputSchema } from "../src/domain/bazi/normalize";

const VALID_INPUT = {
  birthInstant: "1990-05-15T14:00:00+09:00",
  chartGender: "male",
  timezone: "Asia/Shanghai",
  longitude: 121.47,
  latitude: 31.23,
  timeStandard: "civil",
};

describe("BirthInput validation", () => {
  it("accepts the canonical input", () => {
    expect(BirthInputSchema.safeParse(VALID_INPUT).success).toBe(true);
  });

  it("accepts an optional name but rejects an empty one", () => {
    expect(BirthInputSchema.safeParse({ ...VALID_INPUT, subjectName: " 王小明 " }).data?.subjectName).toBe("王小明");
    expect(BirthInputSchema.safeParse({ ...VALID_INPUT, subjectName: "   " }).success).toBe(false);
  });

  it("keeps birthplace and latitude as validated display metadata", () => {
    const result = BirthInputSchema.safeParse({ ...VALID_INPUT, birthplace: " 上海 ", latitude: 31.23 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.birthplace).toBe("上海");
    expect(BirthInputSchema.safeParse({ ...VALID_INPUT, latitude: 91 }).success).toBe(false);
  });

  it("rejects impossible dates", () => {
    const result = BirthInputSchema.safeParse({ ...VALID_INPUT, birthInstant: "2024-02-30T10:00:00+08:00" });
    expect(result.success).toBe(false);
  });

  it("rejects a birth instant without an explicit offset and a mismatched IANA offset", () => {
    expect(BirthInputSchema.safeParse({ ...VALID_INPUT, birthInstant: "1990-05-15T14:00" }).success).toBe(false);
    expect(BirthInputSchema.safeParse({ ...VALID_INPUT, birthInstant: "1990-05-15T14:00:00+08:00" }).success).toBe(false);
  });

  it("rejects invalid timezones", () => {
    expect(BirthInputSchema.safeParse({ ...VALID_INPUT, timezone: "Mars/Olympus" }).success).toBe(false);
  });

  it("rejects out-of-range longitude", () => {
    expect(BirthInputSchema.safeParse({ ...VALID_INPUT, longitude: 200 }).success).toBe(false);
  });

  it("rejects unknown fields such as manual four pillars", () => {
    const result = BirthInputSchema.safeParse({
      ...VALID_INPUT,
      manualPillars: ["甲子", "乙丑", "丙寅", "丁卯"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects removed local-time fields", () => {
    expect(BirthInputSchema.safeParse({ ...VALID_INPUT, localDateTime: "1990-05-15T14:00" }).success).toBe(false);
  });
});
