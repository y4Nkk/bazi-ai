import { describe, expect, it } from "vitest";
import {
  adjacentJieBoundariesAtInstant,
  buildSegmentTable,
  calendarFactsOfInstant,
  dayPillarFor,
  enumerateDays,
  hourPillarFor,
  modelClockOfInstant,
  monthYearPillarsAtInstant,
  monthYearPillarsFor,
  solarOf,
} from "../src/domain/bazi/calendar";
import { natalChartOf } from "../src/domain/bazi/natal";

const directEightChar = (localDateTime: string) =>
  solarOf(localDateTime).getLunar().getEightChar();

describe("solar-term boundaries", () => {
  it("uses the fixed UTC+08 model clock for a New York Li Chun instant", () => {
    const before = "2024-02-04T03:27:06-05:00";
    const at = "2024-02-04T03:27:07-05:00";

    expect(modelClockOfInstant(before)).toBe("2024-02-04T16:27:06");
    expect(monthYearPillarsAtInstant(before)).toEqual({ yearGZ: "癸卯", monthGZ: "乙丑" });
    expect(monthYearPillarsAtInstant(at)).toEqual({ yearGZ: "甲辰", monthGZ: "丙寅" });
    expect(calendarFactsOfInstant(before).nextJieQi.name).toBe("立春");
    expect(adjacentJieBoundariesAtInstant(at).previous.name).toBe("立春");

    const localWall = "2024-02-04T03:27:07";
    const natal = natalChartOf(localWall, at);
    expect(natal.pillars.slice(0, 2).map((pillar) => pillar.ganzhi)).toEqual(["甲辰", "丙寅"]);
    expect(natal.pillars.slice(2).map((pillar) => pillar.ganzhi)).toEqual(
      [directEightChar(localWall).getDay(), directEightChar(localWall).getTime()],
    );
  });

  it("switches the year pillar exactly at Li Chun 2024-02-04 16:27", () => {
    const table = buildSegmentTable("2024-01-15", "2024-03-15");
    expect(monthYearPillarsFor(table, "2024-02-04T07:00:00Z").yearGZ).toBe("癸卯");
    expect(monthYearPillarsFor(table, "2024-02-04T09:00:00Z").yearGZ).toBe("甲辰");
    // agrees with the library's own EightChar
    expect(directEightChar("2024-02-04T15:00").getYear()).toBe("癸卯");
    expect(directEightChar("2024-02-04T17:00").getYear()).toBe("甲辰");
  });

  it("keeps the solar-term second instead of switching at the displayed minute", () => {
    const table = buildSegmentTable("2024-01-15", "2024-03-15");
    expect(monthYearPillarsFor(table, "2024-02-04T08:27:06Z").yearGZ).toBe("癸卯");
    expect(monthYearPillarsFor(table, "2024-02-04T08:27:07Z").yearGZ).toBe("甲辰");
  });

  it("reports Li Chun as the next or previous jieqi around the boundary", () => {
    const before = calendarFactsOfInstant("2024-02-04T07:00:00Z");
    expect(before.nextJieQi.name).toBe("立春");
    const after = calendarFactsOfInstant("2024-02-04T09:00:00Z");
    expect(after.prevJieQi.name).toBe("立春");
  });
});

describe("leap month facts", () => {
  it("marks the 2023 leap second month", () => {
    // 2023-04-20 falls in 闰二月 (started 2023-03-22).
    const facts = calendarFactsOfInstant("2023-04-05T04:00:00Z");
    expect(facts.lunarMonthLabel).toContain("闰");
    expect(facts.lunarMonthLabel).toContain("二");
  });

  it("does not mark a regular month as leap", () => {
    const facts = calendarFactsOfInstant("2023-05-05T04:00:00Z");
    expect(facts.lunarMonthLabel.startsWith("闰")).toBe(false);
  });
});

describe("independent public calendar cross-check", () => {
  it("matches the independently published civil-time four pillars for 1990-05-15 14:00", () => {
    // The public calendar at https://huangli.100xgj.com/day/19900515 lists
    // 庚午 辛巳 庚辰 癸未 for this civil date and its 未时.  This fixture
    // intentionally stays offline: the external publication establishes the
    // expected result, while the test protects our deterministic snapshot.
    expect(natalChartOf("1990-05-15T14:00:00", "1990-05-15T14:00:00+09:00").pillars.map((pillar) => pillar.ganzhi)).toEqual([
      "庚午",
      "辛巳",
      "庚辰",
      "癸未",
    ]);
  });
});

describe("fast transit pillars agree with direct EightChar", () => {
  const sampleDays = [
    ...enumerateDays("2024-01-01", "2024-01-05"),
    ...enumerateDays("2024-02-02", "2024-02-06"),
    ...enumerateDays("2024-05-31", "2024-06-03"),
    ...enumerateDays("2024-11-06", "2024-11-09"),
    ...enumerateDays("2025-01-04", "2025-01-08"),
    ...enumerateDays("2026-08-05", "2026-08-09"),
  ];

  it("day pillar matches for every sampled date", () => {
    for (const day of sampleDays) {
      expect(dayPillarFor(day)).toBe(directEightChar(`${day}T12:00`).getDay());
    }
  });

  it("month and year pillars match across all evaluation hours", () => {
    const table = buildSegmentTable("2023-12-20", "2026-09-01");
    for (const day of sampleDays) {
      for (const hour of [0, 5, 12, 18, 23]) {
        const moment = `${day}T${String(hour).padStart(2, "0")}:30`;
        const fast = monthYearPillarsFor(table, `${moment}:00+08:00`);
        const direct = directEightChar(moment);
        expect(fast.monthGZ).toBe(direct.getMonth());
        expect(fast.yearGZ).toBe(direct.getYear());
      }
    }
  });

  it("hour pillar matches the library, including the late-zi convention", () => {
    // 早子时 (00:xx) uses the current day stem.
    expect(hourPillarFor(dayPillarFor("2024-06-01"), 0)).toBe(
      directEightChar("2024-06-01T00:30").getTime(),
    );
    // 晚子时 (23:xx) uses the next day stem.
    expect(hourPillarFor(dayPillarFor("2024-06-02"), 0)).toBe(
      directEightChar("2024-06-01T23:00").getTime(),
    );
    for (const shichenIndex of [3, 6, 9, 11]) {
      const hour = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21][shichenIndex];
      expect(hourPillarFor(dayPillarFor("2024-06-01"), shichenIndex)).toBe(
        directEightChar(`2024-06-01T${String(hour).padStart(2, "0")}:00`).getTime(),
      );
    }
  });
});
