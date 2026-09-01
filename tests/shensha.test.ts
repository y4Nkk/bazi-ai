import { describe, expect, it } from "vitest";
import { natalChartOf } from "../src/domain/bazi/natal";
import { shenshaForGanzhi, type ShenshaContext } from "../src/domain/bazi/shensha";
import { SHENSHA_CODES, SHENSHA_EVIDENCE } from "../src/domain/bazi/shensha-evidence";

const context: ShenshaContext = {
  dayStem: "甲",
  dayBranch: "寅",
  monthBranch: "寅",
  yearBranch: "子",
  voidBranches: ["戌", "亥"],
};

describe("closed shensha annotation catalog", () => {
  it("matches independent day-stem, month-branch, day-branch, and year-branch lookups", () => {
    const labels = shenshaForGanzhi(context, "丁卯").map((fact) => fact.label);

    expect(labels).toContain("天德贵人");
    expect(labels).toContain("桃花");
    expect(labels).toContain("红鸾");
  });

  it("keeps void and branch-group annotations traceable to their natal references", () => {
    const facts = shenshaForGanzhi(context, "辛亥");

    expect(facts).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "SHENSHA_JIE_SHA", label: "劫煞", reference: "日支寅", target: "亥" }),
      expect.objectContaining({ code: "SHENSHA_KONG_WANG", label: "空亡", target: "亥" }),
    ]));
  });

  it("adds directly-cited 德秀 and 六厄 lookups with source-grade metadata", () => {
    const deXiu = shenshaForGanzhi(context, "丙子").find((fact) => fact.code === "SHENSHA_DE_XIU");
    const liuE = shenshaForGanzhi(context, "辛酉").find((fact) => fact.code === "SHENSHA_LIU_E");

    expect(deXiu).toMatchObject({
      label: "德秀贵人",
      reference: "月支寅",
      target: "丙",
      evidence: { grade: "原典直引", section: "卷三·论德秀" },
    });
    expect(liuE).toMatchObject({
      label: "六厄",
      reference: "日支寅",
      target: "酉",
      evidence: { grade: "原典直引", section: "卷三·论六厄" },
    });
  });

  it("upgrades only lookup tables that match newly located primary texts", () => {
    const tianChu = shenshaForGanzhi(context, "丁巳").find((fact) => fact.code === "SHENSHA_TIAN_CHU");
    const huaGai = shenshaForGanzhi(context, "丁戌").find((fact) => fact.code === "SHENSHA_HUA_GAI");
    const jiangXing = shenshaForGanzhi(context, "丁午").find((fact) => fact.code === "SHENSHA_JIANG_XING");
    const fuXing = shenshaForGanzhi(context, "丁寅").find((fact) => fact.code === "SHENSHA_FU_XING");
    const feiRen = shenshaForGanzhi(context, "丁酉").find((fact) => fact.code === "SHENSHA_FEI_REN");

    expect(tianChu?.evidence).toMatchObject({ grade: "原典直引", work: "《五行精纪》", section: "天厨格" });
    expect(huaGai?.evidence).toMatchObject({ grade: "原典直引", work: "《五行精纪》", section: "论华盖" });
    expect(jiangXing?.evidence).toMatchObject({ grade: "原典直引", work: "《钦定古今图书集成》" });
    expect(fuXing?.evidence.grade).toBe("流派变体");
    expect(feiRen?.evidence.grade).toBe("流派变体");
  });

  it("attaches a closed evidence record to every emitted annotation", () => {
    for (const fact of shenshaForGanzhi(context, "丁卯")) {
      expect(["原典直引", "流派变体", "待原典核验"]).toContain(fact.evidence.grade);
      expect(fact.evidence.work).not.toHaveLength(0);
      expect(fact.evidence.section).not.toHaveLength(0);
    }
  });

  it("keeps a source record for every code in the closed catalog", () => {
    expect(Object.keys(SHENSHA_EVIDENCE).sort()).toEqual(Object.values(SHENSHA_CODES).sort());
  });

  it("derives stable auxiliary pillars from the same selected natal chart", () => {
    const natal = natalChartOf("1990-05-15T14:00:00");

    expect(natal.pillars.map((pillar) => pillar.ganzhi)).toEqual(["庚午", "辛巳", "庚辰", "癸未"]);
    expect(natal.auxiliaryPillars.map(({ name, ganzhi }) => [name, ganzhi])).toEqual([
      ["胎元", "壬申"],
      ["胎息", "乙酉"],
      ["命宫", "辛巳"],
      ["身宫", "己丑"],
    ]);
    expect(natal.pillars.every((pillar) => Array.isArray(pillar.shensha))).toBe(true);
  });
});
