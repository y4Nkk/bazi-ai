import { describe, expect, it } from "vitest";
import { PLACES, searchPlaces } from "@/lib/places";
import { TIMEZONE_OPTIONS } from "@/components/birth-form";

function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

describe("places dataset", () => {
  it("holds a substantial, deduplicated place table", () => {
    expect(PLACES.length).toBeGreaterThan(400);
    const keys = PLACES.map((place) => `${place.name}|${place.region}`);
    expect(new Set(keys).size).toBe(PLACES.length);
  });

  it("keeps every record inside valid coordinate and timezone ranges", () => {
    for (const place of PLACES) {
      expect(place.lon, place.name).toBeGreaterThanOrEqual(-180);
      expect(place.lon, place.name).toBeLessThanOrEqual(180);
      expect(place.lat, place.name).toBeGreaterThanOrEqual(-90);
      expect(place.lat, place.name).toBeLessThanOrEqual(90);
      expect(isValidTimezone(place.timezone), `${place.name}: ${place.timezone}`).toBe(true);
    }
  });

  it("uses only timezones the birth form offers", () => {
    const offered = new Set(TIMEZONE_OPTIONS);
    const missing = [...new Set(PLACES.map((place) => place.timezone))].filter(
      (timezone) => !offered.has(timezone),
    );
    expect(missing).toEqual([]);
  });

  it("matches known city coordinates used by the true-solar correction", () => {
    const nanning = searchPlaces("南宁")[0];
    expect(nanning).toMatchObject({ name: "南宁", lon: 108.32, lat: 22.82, timezone: "Asia/Shanghai" });
    const shanghai = searchPlaces("上海")[0];
    expect(shanghai).toMatchObject({ name: "上海", lon: 121.47, lat: 31.23 });
    const urumqi = searchPlaces("乌鲁木齐")[0];
    expect(urumqi).toMatchObject({ name: "乌鲁木齐", lon: 87.62, lat: 43.79, timezone: "Asia/Shanghai" });
    const tokyo = searchPlaces("东京")[0];
    expect(tokyo).toMatchObject({ name: "东京", timezone: "Asia/Tokyo" });
    const hongkong = searchPlaces("香港")[0];
    expect(hongkong).toMatchObject({ name: "香港", timezone: "Asia/Hong_Kong" });
  });
});

describe("searchPlaces", () => {
  it("returns [] for empty or whitespace queries", () => {
    expect(searchPlaces("")).toEqual([]);
    expect(searchPlaces("   ")).toEqual([]);
  });

  it("ranks exact name matches first", () => {
    const results = searchPlaces("南京");
    expect(results[0]?.name).toBe("南京");
    expect(results.some((place) => place.name === "南宁")).toBe(false);
  });

  it("strips administrative suffixes from the query", () => {
    expect(searchPlaces("南宁市")[0]?.name).toBe("南宁");
    expect(searchPlaces("广州 ")[0]?.name).toBe("广州");
  });

  it("finds prefix matches", () => {
    expect(searchPlaces("乌鲁")[0]?.name).toBe("乌鲁木齐");
  });

  it("supports province search and caps results", () => {
    const guangxi = searchPlaces("广西", 30);
    expect(guangxi.length).toBeGreaterThan(5);
    expect(guangxi.every((place) => place.region === "广西")).toBe(true);
    expect(searchPlaces("广西")).toHaveLength(8);
  });

  it("returns [] for unknown queries", () => {
    expect(searchPlaces("亚特兰蒂斯")).toEqual([]);
  });
});
