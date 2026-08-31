import { describe, expect, it } from "vitest";
import { BirthInputSchema } from "../src/domain/bazi/normalize";

const VALID_INPUT = {
  calendar: "gregorian",
  localDateTime: "1990-05-15T14:00",
  chartGender: "male",
  timezone: "Asia/Shanghai",
  birthplace: "上海",
  longitude: 121.47,
  latitude: 31.23,
  timeStandard: "civil",
};

describe("BirthInput validation", () => {
  it("accepts the canonical input", () => {
    expect(BirthInputSchema.safeParse(VALID_INPUT).success).toBe(true);
  });

  it("rejects impossible dates", () => {
    const result = BirthInputSchema.safeParse({ ...VALID_INPUT, localDateTime: "2024-02-30T10:00" });
    expect(result.success).toBe(false);
  });

  it("rejects malformed local datetime formats", () => {
    expect(BirthInputSchema.safeParse({ ...VALID_INPUT, localDateTime: "1990-05-15 14:00" }).success).toBe(false);
    expect(BirthInputSchema.safeParse({ ...VALID_INPUT, localDateTime: "1990-05-15T14" }).success).toBe(false);
  });

  it("rejects invalid timezones", () => {
    expect(BirthInputSchema.safeParse({ ...VALID_INPUT, timezone: "Mars/Olympus" }).success).toBe(false);
  });

  it("rejects out-of-range coordinates", () => {
    expect(BirthInputSchema.safeParse({ ...VALID_INPUT, longitude: 200 }).success).toBe(false);
    expect(BirthInputSchema.safeParse({ ...VALID_INPUT, latitude: -95 }).success).toBe(false);
  });

  it("rejects unknown fields such as manual four pillars", () => {
    const result = BirthInputSchema.safeParse({
      ...VALID_INPUT,
      manualPillars: ["甲子", "乙丑", "丙寅", "丁卯"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-gregorian calendar", () => {
    expect(BirthInputSchema.safeParse({ ...VALID_INPUT, calendar: "lunar" }).success).toBe(false);
  });
});
