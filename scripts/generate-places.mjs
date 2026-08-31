/**
 * One-shot generator for src/lib/places-data.ts.
 *
 * Chinese city coordinates come from the public Aliyun DataV GeoAtlas
 * (https://geo.datav.aliyun.com/areas_v3/bound/all.json), filtered to
 * city-level divisions. Municipalities, Hong Kong, Macau, and the overseas
 * table below are appended by hand. Rerun only when refreshing the dataset:
 *   node scripts/generate-places.mjs
 */
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SOURCE_URL = "https://geo.datav.aliyun.com/areas_v3/bound/all.json";
const OUT_FILE = new URL("../src/lib/places-data.ts", import.meta.url);

const OVERSEAS = [
  ["台北", "台湾", 121.56, 25.03, "Asia/Taipei"],
  ["高雄", "台湾", 120.3, 22.62, "Asia/Taipei"],
  ["东京", "日本", 139.69, 35.69, "Asia/Tokyo"],
  ["大阪", "日本", 135.5, 34.69, "Asia/Tokyo"],
  ["名古屋", "日本", 136.9, 35.18, "Asia/Tokyo"],
  ["首尔", "韩国", 126.98, 37.57, "Asia/Seoul"],
  ["釜山", "韩国", 129.08, 35.18, "Asia/Seoul"],
  ["新加坡", "新加坡", 103.85, 1.29, "Asia/Singapore"],
  ["吉隆坡", "马来西亚", 101.69, 3.14, "Asia/Kuala_Lumpur"],
  ["曼谷", "泰国", 100.5, 13.76, "Asia/Bangkok"],
  ["河内", "越南", 105.83, 21.03, "Asia/Ho_Chi_Minh"],
  ["胡志明市", "越南", 106.66, 10.76, "Asia/Ho_Chi_Minh"],
  ["马尼拉", "菲律宾", 120.98, 14.6, "Asia/Manila"],
  ["雅加达", "印度尼西亚", 106.85, -6.21, "Asia/Jakarta"],
  ["新德里", "印度", 77.21, 28.64, "Asia/Kolkata"],
  ["孟买", "印度", 72.88, 19.08, "Asia/Kolkata"],
  ["迪拜", "阿联酋", 55.27, 25.2, "Asia/Dubai"],
  ["伊斯坦布尔", "土耳其", 28.98, 41.01, "Europe/Istanbul"],
  ["莫斯科", "俄罗斯", 37.62, 55.76, "Europe/Moscow"],
  ["伦敦", "英国", -0.13, 51.51, "Europe/London"],
  ["巴黎", "法国", 2.35, 48.86, "Europe/Paris"],
  ["柏林", "德国", 13.4, 52.52, "Europe/Berlin"],
  ["慕尼黑", "德国", 11.58, 48.14, "Europe/Berlin"],
  ["罗马", "意大利", 12.5, 41.9, "Europe/Rome"],
  ["米兰", "意大利", 9.19, 45.46, "Europe/Rome"],
  ["马德里", "西班牙", -3.7, 40.42, "Europe/Madrid"],
  ["巴塞罗那", "西班牙", 2.17, 41.39, "Europe/Madrid"],
  ["阿姆斯特丹", "荷兰", 4.9, 52.37, "Europe/Amsterdam"],
  ["苏黎世", "瑞士", 8.54, 47.38, "Europe/Zurich"],
  ["斯德哥尔摩", "瑞典", 18.07, 59.33, "Europe/Stockholm"],
  ["开罗", "埃及", 31.24, 30.04, "Africa/Cairo"],
  ["纽约", "美国", -74.01, 40.71, "America/New_York"],
  ["洛杉矶", "美国", -118.24, 34.05, "America/Los_Angeles"],
  ["旧金山", "美国", -122.42, 37.77, "America/Los_Angeles"],
  ["西雅图", "美国", -122.33, 47.61, "America/Los_Angeles"],
  ["芝加哥", "美国", -87.63, 41.88, "America/Chicago"],
  ["檀香山", "美国", -157.86, 21.31, "Pacific/Honolulu"],
  ["多伦多", "加拿大", -79.38, 43.65, "America/Toronto"],
  ["温哥华", "加拿大", -123.12, 49.28, "America/Vancouver"],
  ["圣保罗", "巴西", -46.63, -23.55, "America/Sao_Paulo"],
  ["悉尼", "澳大利亚", 151.21, -33.87, "Australia/Sydney"],
  ["墨尔本", "澳大利亚", 144.96, -37.81, "Australia/Melbourne"],
  ["布里斯班", "澳大利亚", 153.03, -27.47, "Australia/Brisbane"],
  ["奥克兰", "新西兰", 174.76, -36.85, "Pacific/Auckland"],
];

const OVERSEAS_TZ = {
  台湾: "Asia/Taipei",
  日本: "Asia/Tokyo",
  韩国: "Asia/Seoul",
  新加坡: "Asia/Singapore",
  马来西亚: "Asia/Kuala_Lumpur",
  泰国: "Asia/Bangkok",
  越南: "Asia/Ho_Chi_Minh",
  菲律宾: "Asia/Manila",
  印度尼西亚: "Asia/Jakarta",
  印度: "Asia/Kolkata",
  阿联酋: "Asia/Dubai",
  土耳其: "Europe/Istanbul",
  俄罗斯: "Europe/Moscow",
  英国: "Europe/London",
  法国: "Europe/Paris",
  德国: "Europe/Berlin",
  意大利: "Europe/Rome",
  西班牙: "Europe/Madrid",
  荷兰: "Europe/Amsterdam",
  瑞士: "Europe/Zurich",
  瑞典: "Europe/Stockholm",
  埃及: "Africa/Cairo",
  美国: "America/New_York",
  加拿大: "America/Toronto",
  巴西: "America/Sao_Paulo",
  澳大利亚: "Australia/Sydney",
  新西兰: "Pacific/Auckland",
};

const MUNICIPALITY_TZ = { 北京市: "Asia/Shanghai", 天津市: "Asia/Shanghai", 上海市: "Asia/Shanghai", 重庆市: "Asia/Shanghai" };
const SAR_TZ = { "香港特别行政区": "Asia/Hong_Kong", "澳门特别行政区": "Asia/Macau" };

function shortProvince(name) {
  return name
    .replace(/壮族|维吾尔|回族/g, "")
    .replace(/自治区|特别行政区|省/g, "")
    .replace(/市$/, "");
}

const response = await fetch(SOURCE_URL);
if (!response.ok) throw new Error(`source fetch failed: ${response.status}`);
const divisions = await response.json();

const provinces = new Map(
  divisions
    .filter((d) => d.level === "province")
    .map((d) => [d.name, { lon: d.lng, lat: d.lat, adcode: d.adcode }]),
);

const rows = [];
for (const d of divisions) {
  if (d.level !== "city") continue;
  rows.push({
    name: d.name.replace(/市$/, ""),
    region: shortProvince(divisionProvinceName(d)),
    lon: round(d.lng),
    lat: round(d.lat),
    timezone: "Asia/Shanghai",
  });
}
for (const key of ["台湾省", "香港特别行政区", "澳门特别行政区"]) {
  const p = provinces.get(key);
  rows.push({
    name: shortProvince(key),
    region: shortProvince(key),
    lon: round(p.lon),
    lat: round(p.lat),
    timezone: key === "台湾省" ? "Asia/Taipei" : SAR_TZ[key],
  });
}
for (const [name, tz] of Object.entries(MUNICIPALITY_TZ)) {
  const p = provinces.get(name);
  rows.push({ name: shortProvince(name), region: shortProvince(name), lon: round(p.lon), lat: round(p.lat), timezone: tz });
}
for (const [name, region, lon, lat, timezone] of OVERSEAS) {
  rows.push({ name, region: region === name ? "" : region, lon, lat, timezone });
}

// Municipality/SAR province entries duplicate the appended rows above.
const seen = new Set();
const unique = rows.filter((r) => {
  const key = `${r.name}|${r.region}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

const body = unique
  .map((r) => `  { name: ${q(r.name)}, region: ${q(r.region)}, lon: ${r.lon}, lat: ${r.lat}, timezone: ${q(r.timezone)} },`)
  .join("\n");

const file = `/**
 * Generated by scripts/generate-places.mjs from the public Aliyun DataV
 * GeoAtlas (${SOURCE_URL}); overseas cities are curated by hand in the
 * generator. Do not edit by hand — regenerate instead.
 * Coordinates are decimal degrees (east/north positive), rounded to 0.01°.
 */
export const PLACES_DATA = [
${body}
];
`;

writeFileSync(OUT_FILE, file, "utf8");
console.log(`wrote ${unique.length} places to ${OUT_FILE.pathname}`);

function divisionProvinceName(cityDivision) {
  const parent = cityDivision.parent;
  const match = divisions.find((d) => d.adcode === parent);
  if (!match) throw new Error(`missing parent ${parent} for ${cityDivision.name}`);
  return match.name;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function q(value) {
  return JSON.stringify(value);
}
