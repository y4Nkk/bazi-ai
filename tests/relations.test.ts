import { describe, expect, it } from "vitest";
import { natalChartOf } from "../src/domain/bazi/natal";
import { natalRelationsOf, temporalRelationsOf } from "../src/domain/bazi/relations";
import { BRANCH_ELEMENTS, STEM_ELEMENTS, type EarthlyBranch, type HeavenlyStem } from "../src/domain/bazi/constants";

function natalWithBranches(branches: EarthlyBranch[]) {
  const natal = natalChartOf("1990-05-15T14:00");
  return { ...natal, pillars: natal.pillars.map((pillar, index) => ({ ...pillar, branch: branches[index] })) };
}

function natalWithPillars(branches: EarthlyBranch[], stems: HeavenlyStem[]) {
  const natal = natalChartOf("1990-05-15T14:00");
  return {
    ...natal,
    pillars: natal.pillars.map((pillar, index) => ({
      ...pillar,
      stem: stems[index],
      branch: branches[index],
      stemElement: STEM_ELEMENTS[stems[index]],
      branchElement: BRANCH_ELEMENTS[branches[index]],
    })),
  };
}

describe("relation adjudication", () => {
  it("records a visible 六合 as broken when a natal clash destroys it", () => {
    // 癸亥 甲子 丁丑 丙午: 子丑六合, but 子午冲 is simultaneously present.
    const natal = natalChartOf("1983-12-15T12:00");
    const relation = natalRelationsOf(natal).find((edge) => edge.code.startsWith("ZHI_LIUHE:子丑"));
    expect(relation?.state).toBe("broken");
    expect(relation?.blockers).toContain("子冲午");
  });

  it("distinguishes formed, untransformed, blocked, and contested combinations", () => {
    const formed = natalRelationsOf(natalWithBranches(["子", "丑", "寅", "申"]))
      .find((edge) => edge.code.startsWith("ZHI_LIUHE:子丑"));
    const unformed = natalRelationsOf(natalWithBranches(["子", "巳", "丑", "申"]))
      .find((edge) => edge.code.startsWith("ZHI_LIUHE:子丑"));
    const contested = natalRelationsOf(natalWithBranches(["子", "丑", "申", "辰"]))
      .find((edge) => edge.code.startsWith("ZHI_LIUHE:子丑"));
    const blocked = natalRelationsOf(natalWithBranches(["子", "丑", "酉", "寅"]))
      .find((edge) => edge.code.startsWith("ZHI_LIUHE:子丑"));

    expect(formed?.state).toBe("formed");
    expect(unformed?.state).toBe("untransformed");
    expect(blocked?.state).toBe("blocked");
    expect(blocked?.blockers).toContain("子破酉");
    expect(contested?.state).toBe("contested");
  });

  it("re-evaluates cross-layer 天克地冲 and 岁运并临 for each period", () => {
    const natal = natalChartOf("1990-05-15T14:00");
    const edges = temporalRelationsOf(natal, {
      luck: "甲子",
      year: "甲子",
      month: "庚申",
      day: "丙午",
      hour: "壬寅",
    });
    expect(edges.some((edge) => edge.code === "SUIYUN_BINLIN" && edge.state === "formed")).toBe(true);
    expect(edges.some((edge) => edge.code === "TIANKEDICHONG" && edge.state === "formed")).toBe(true);
  });

  it("lets a moving clash block an otherwise formed natal combination", () => {
    const natal = natalWithBranches(["子", "丑", "寅", "申"]);
    const edges = temporalRelationsOf(natal, {
      luck: null,
      year: "甲午",
      month: "乙巳",
      day: "丙辰",
      hour: "丁卯",
    });
    const relation = edges.find((edge) => edge.code.startsWith("ZHI_LIUHE:子丑"));
    expect(relation?.state).toBe("broken");
    expect(relation?.blockers).toContain("子冲午");
    expect(relation?.temporalLayer).toBe("流年");
  });

  it("re-adjudicates a natal 六合 as contested when moving branches complete a competing 合局", () => {
    const natal = natalWithBranches(["午", "未", "巳", "酉"]);
    const edges = temporalRelationsOf(natal, {
      luck: null,
      year: "甲寅",
      month: "乙巳",
      day: "丙戌",
      hour: "丁酉",
    });
    const relation = edges.find((edge) => edge.code.startsWith("ZHI_LIUHE:午未"));
    expect(relation?.state).toBe("contested");
    expect(relation?.temporalLayer).toBe("流日");
    expect(relation?.blockers).toContain("同一支同时参与合局与六合");
  });

  it("records stem generation and control across natal and moving layers", () => {
    const natal = natalChartOf("1990-05-15T14:00");
    const edges = temporalRelationsOf(natal, {
      luck: null,
      year: "己丑",
      month: "丙午",
      day: "乙巳",
      hour: "丁酉",
    });
    expect(edges.some((edge) => edge.code.startsWith("GAN_SHENG:") && edge.state === "formed")).toBe(true);
    expect(edges.some((edge) => edge.code.startsWith("GAN_KE:") && edge.state === "formed")).toBe(true);
  });

  it("keeps half combinations and arch combinations distinct until the third branch arrives", () => {
    const half = natalRelationsOf(natalWithBranches(["寅", "午", "酉", "子"]));
    const arch = natalRelationsOf(natalWithBranches(["寅", "戌", "酉", "子"]));
    expect(half.some((edge) => edge.code === "ZHI_BANHE:寅午戌" && edge.state === "untransformed")).toBe(true);
    expect(arch.some((edge) => edge.code === "ZHI_GONGHE:寅午戌" && edge.state === "untransformed")).toBe(true);
  });

  it("adjudicates stem combinations as formed, untransformed, or broken", () => {
    const formed = natalRelationsOf(natalWithPillars(["寅", "辰", "午", "未"], ["甲", "己", "丙", "辛"]));
    const untransformed = natalRelationsOf(natalWithPillars(["辰", "巳", "午", "未"], ["甲", "己", "丙", "辛"]));
    const broken = natalRelationsOf(natalWithPillars(["寅", "辰", "申", "未"], ["甲", "己", "丙", "辛"]));
    const selfPunished = natalRelationsOf(natalWithPillars(["寅", "辰", "辰", "未"], ["甲", "己", "丙", "辛"]));

    expect(formed.some((edge) => edge.code === "GAN_WUHE:甲己" && edge.state === "formed")).toBe(true);
    expect(untransformed.some((edge) => edge.code === "GAN_WUHE:甲己" && edge.state === "untransformed")).toBe(true);
    expect(broken.some((edge) => edge.code === "GAN_WUHE:甲己" && edge.state === "broken")).toBe(true);
    expect(selfPunished.some((edge) => edge.code === "GAN_WUHE:甲己" && edge.state === "blocked" && edge.blockers.includes("辰刑辰"))).toBe(true);
  });

  it("adjudicates complete 三合 and 三会 rather than treating visible branches as automatic transformations", () => {
    const sanheFormed = natalRelationsOf(natalWithPillars(["寅", "午", "戌", "寅"], ["丙", "丁", "甲", "乙"]));
    const sanheUntransformed = natalRelationsOf(natalWithPillars(["午", "寅", "戌", "寅"], ["庚", "辛", "壬", "癸"]));
    const sanheBroken = natalRelationsOf(natalWithPillars(["寅", "午", "戌", "申"], ["丙", "丁", "甲", "乙"]));
    const sanhuiFormed = natalRelationsOf(natalWithPillars(["寅", "卯", "辰", "寅"], ["甲", "乙", "丙", "丁"]));
    const sanhuiUntransformed = natalRelationsOf(natalWithPillars(["寅", "辰", "卯", "寅"], ["庚", "辛", "壬", "癸"]));
    const sanhuiBroken = natalRelationsOf(natalWithPillars(["寅", "卯", "辰", "酉"], ["甲", "乙", "丙", "丁"]));

    expect(sanheFormed.some((edge) => edge.code === "ZHI_SANHE:寅午戌" && edge.state === "formed")).toBe(true);
    expect(sanheUntransformed.some((edge) => edge.code === "ZHI_SANHE:寅午戌" && edge.state === "untransformed")).toBe(true);
    expect(sanheBroken.some((edge) => edge.code === "ZHI_SANHE:寅午戌" && edge.state === "broken")).toBe(true);
    expect(sanhuiFormed.some((edge) => edge.code === "ZHI_SANHUI:寅卯辰" && edge.state === "formed")).toBe(true);
    expect(sanhuiUntransformed.some((edge) => edge.code === "ZHI_SANHUI:寅卯辰" && edge.state === "untransformed")).toBe(true);
    expect(sanhuiBroken.some((edge) => edge.code === "ZHI_SANHUI:寅卯辰" && edge.state === "broken")).toBe(true);
  });
});
