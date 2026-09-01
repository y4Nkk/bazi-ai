import { describe, expect, it } from "vitest";
import { formatProfessionalEndpoint, formatProfessionalSubjects } from "@/components/professional-panel";

describe("professional detail Chinese presentation", () => {
  it("converts internal pillar positions into Chinese reading labels", () => {
    expect(formatProfessionalSubjects(["year", "hour", "辛巳", "甲午"])).toBe("年柱 · 时柱 · 辛巳 · 甲午");
    expect(formatProfessionalSubjects(["month · transitYear · 辛丑 · 丙午"])).toBe("月柱 · 流年 · 辛丑 · 丙午");
    expect(formatProfessionalSubjects(["己", "土", "late"])).toBe("己 · 土 · 节后");
  });

  it("formats an endpoint in the selected birth timezone", () => {
    expect(formatProfessionalEndpoint("2026-09-01T08:00:00.000Z", "Asia/Shanghai")).toContain("2026年9月1日 16:00:00");
  });
});
