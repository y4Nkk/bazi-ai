/**
 * One-shot UI walkthrough: desktop (>=1068px) and mobile (<=419px) widths.
 * Fills the birth form, generates the chart, switches resolutions and
 * dimension, selects a candle, and checks layout invariants (no horizontal
 * scroll, 44px touch targets). Screenshots go to the OS temp directory.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// localhost (not 127.0.0.1): the reload steps below re-fetch dev chunks, and
// Next 14 dev serves them cross-origin-404 when the host mismatches.
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_DIR = join(tmpdir(), "bazi-ui-walkthrough");
mkdirSync(OUT_DIR, { recursive: true });

const failures = [];
const check = (ok, label, detail = "") => {
  const line = `${ok ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`;
  console.log(line);
  if (!ok) failures.push(line);
};

/** Radix Select: open the trigger, then click the option by visible label. */
async function pickSelect(page, triggerId, optionLabel) {
  await page.click(`#${triggerId}`);
  await page.getByRole("option", { name: optionLabel }).click();
}

/** Picks the birth date through the DatePicker popover: 今天 (the run day). */
async function pickBirthDate(page) {
  await page.click("#birth-date");
  await page.getByRole("button", { name: "今天", exact: true }).click();
}

/** Picks the birth time through the TimePicker popover: 14:00. */
async function pickBirthTime(page) {
  await page.click("#birth-time");
  await page
    .getByRole("group", { name: "小时" })
    .getByRole("button", { name: "14", exact: true })
    .click();
  await page
    .getByRole("group", { name: "分钟" })
    .getByRole("button", { name: "00", exact: true })
    .click();
  await page.getByRole("button", { name: "完成", exact: true }).click();
}

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

async function fillBirthForm(page) {
  await pickBirthDate(page);
  await pickBirthTime(page);
  await page.check('input[name="chart-gender"][value="male"]');
  await page.fill("#birthplace", "上海");
  await pickSelect(page, "timezone", "Asia/Shanghai");
  await page.fill("#longitude", "121.47");
  await page.fill("#latitude", "31.23");
  await page.check('input[name="time-standard"][value="civil"]');
}

/** Picking a place from the combobox must auto-fill lon/lat (and timezone). */
async function checkPlacePicker(page, label) {
  await page.fill("#birthplace", "乌鲁");
  await page.waitForSelector('div[role="listbox"]', { timeout: 10000 });
  await page.screenshot({ path: join(OUT_DIR, `${label}-place-picker.png`) });
  await page.getByRole("option", { name: /乌鲁木齐/ }).click();
  const lon = await page.inputValue("#longitude");
  const lat = await page.inputValue("#latitude");
  const tz = (await page.locator("#timezone").textContent())?.trim();
  const place = await page.inputValue("#birthplace");
  check(
    place === "乌鲁木齐" && lon === "87.62" && lat === "43.79" && tz === "Asia/Shanghai",
    `${label}: picking 乌鲁木齐 auto-fills birthplace/lon/lat/timezone`,
    `place=${place} lon=${lon} lat=${lat} tz=${tz}`,
  );
}

const PROVIDER_KEY_URLS = {
  OpenAI: "https://platform.openai.com/api-keys",
  Anthropic: "https://platform.claude.com/settings/keys",
  Google: "https://aistudio.google.com/apikey",
  DeepSeek: "https://platform.deepseek.com/api_keys",
};

async function checkAiProviderLinks(page, label) {
  const defaultProvider = (await page.locator("#ai-provider").textContent())?.trim();
  const defaultModel = await page.inputValue("#ai-model");
  check(
    defaultProvider === "DeepSeek" && defaultModel === "deepseek-v4-flash",
    `${label}: AI defaults to DeepSeek`,
    `provider=${defaultProvider} model=${defaultModel}`,
  );

  for (const [provider, expectedUrl] of Object.entries(PROVIDER_KEY_URLS)) {
    await pickSelect(page, "ai-provider", provider);
    const link = page.getByRole("link", { name: `获取 ${provider} API Key` });
    check(
      (await link.getAttribute("href")) === expectedUrl,
      `${label}: ${provider} API-key link targets its official console`,
      await link.getAttribute("href"),
    );
  }

  await pickSelect(page, "ai-provider", "DeepSeek");
}

async function waitForCandleCount(page, exactCount) {
  await page.waitForSelector('svg g[role="button"]', { timeout: 45000 });
  await page.waitForFunction(
    (n) => document.querySelectorAll('svg g[role="button"]').length === n,
    exactCount,
    { timeout: 45000 },
  );
}

async function layoutAudit(page, label) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
  });
  check(
    overflow.scrollWidth <= overflow.clientWidth + 1,
    `${label}: no horizontal scroll`,
    `scrollWidth=${overflow.scrollWidth} clientWidth=${overflow.clientWidth}`,
  );

  const smallTargets = await page.evaluate(() => {
    const selectors = "button, select, input, textarea, a[href], label";
    const out = [];
    for (const el of document.querySelectorAll(selectors)) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      if (rect.width === 0 || rect.height === 0) continue;
      // sr-only inputs are intentionally invisible; plain text labels wrap no
      // control and are not touch targets (their controls are audited here).
      // aria-hidden subtrees (e.g. Radix's 1x1 form-compat select) are also
      // unreachable and excluded.
      if (el.classList.contains("sr-only")) continue;
      if (el.closest('[aria-hidden="true"]')) continue;
      if (el.tagName === "LABEL" && !el.querySelector("input")) continue;
      if (rect.height < 43.5) {
        out.push(`${el.tagName.toLowerCase()}#${el.id || ""} h=${rect.height.toFixed(1)}w=${rect.width.toFixed(1)}`);
      }
    }
    return out;
  });
  check(smallTargets.length === 0, `${label}: touch targets >= 44px`, smallTargets.join(" | "));
}

const browser = await chromium.launch({ channel: "chrome", headless: true });

/* ---------------- Desktop ---------------- */
const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await desktop.newPage();
await page.goto(BASE_URL);
await page.waitForLoadState("domcontentloaded");
await checkPlacePicker(page, "desktop");
await fillBirthForm(page);
await page.screenshot({ path: join(OUT_DIR, "desktop-initial.png") });

await page.click('button[type="submit"]');
await waitForCandleCount(page, 31);
await page.screenshot({ path: join(OUT_DIR, "desktop-chart-day.png"), fullPage: true });
check(true, "desktop: day view renders a month of candles", "count=31");

// After generation the form collapses into a one-line birth summary.
await page.waitForSelector('section[aria-label="出生信息摘要"]');
const summaryText = await page.locator('section[aria-label="出生信息摘要"]').textContent();
check(
  Boolean(summaryText?.includes("Asia/Shanghai")) && Boolean(summaryText?.includes(todayIso())),
  "desktop: form collapses into a birth summary after generation",
  summaryText?.trim().slice(0, 60) ?? "",
);
check(
  (await page.locator("#birth-form").count()) === 0,
  "desktop: full form hidden after generation",
);
await page.locator('button', { hasText: "修改出生信息" }).first().click();
await page.waitForSelector("#birth-form");
check(true, "desktop: edit toggle reopens the form");
await checkAiProviderLinks(page, "desktop");

// Selected candle panel updates after clicking a candle.
const kpiBefore = await page
  .locator("p", { hasText: /收盘指数/ })
  .first()
  .evaluate((el) => el.closest("div")?.textContent ?? "");
await page.locator('svg g[role="button"]').nth(5).click();
await page.waitForTimeout(300);
const kpiAfter = await page
  .locator("p", { hasText: /收盘指数/ })
  .first()
  .evaluate((el) => el.closest("div")?.textContent ?? "");
check(kpiBefore !== kpiAfter, "desktop: selecting a candle updates the detail panel", `${kpiBefore.slice(0, 40)} → ${kpiAfter.slice(0, 40)}`);

// Resolution switching preserves the dimension.
await pickSelect(page, "dimension-select", "财运");
await waitForCandleCount(page, 31);
await page.click('text=月视图');
await waitForCandleCount(page, 24);
check(true, "desktop: month view renders 24 candles");
const dimAfterSwitch = (await page.locator("#dimension-select").textContent())?.trim();
check(dimAfterSwitch === "财运", "desktop: resolution switch preserves dimension", `dimension=${dimAfterSwitch}`);
await page.screenshot({ path: join(OUT_DIR, "desktop-chart-month.png"), fullPage: true });

await page.click('text=年视图');
await waitForCandleCount(page, 12);
check(true, "desktop: year view renders 12 candles");
await page.screenshot({ path: join(OUT_DIR, "desktop-chart-year.png"), fullPage: true });

// A refresh restores the cached chart (year view, 财运) without resubmitting.
await page.reload();
await page.waitForSelector('section[aria-label="出生信息摘要"]');
await waitForCandleCount(page, 12);
const restoredDim = (await page.locator("#dimension-select").textContent())?.trim();
check(
  restoredDim === "财运",
  "desktop: refresh restores the cached chart without re-submitting",
  `candles=12 dimension=${restoredDim}`,
);
await page.screenshot({ path: join(OUT_DIR, "desktop-restored.png"), fullPage: true });

await layoutAudit(page, "desktop");

// A corrupted cache entry is discarded and the fresh form is shown.
await page.evaluate(() => window.localStorage.setItem("bazi.workbench.zp1", "{not json"));
await page.reload();
await page.waitForSelector("#birth-form");
check(true, "desktop: corrupted cache is discarded, fresh form shown");
await desktop.close();

/* ---------------- Mobile ---------------- */
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mpage = await mobile.newPage();
await mpage.goto(BASE_URL);
await mpage.waitForLoadState("domcontentloaded");
await checkPlacePicker(mpage, "mobile");
await fillBirthForm(mpage);
await mpage.click('button[type="submit"]');
await waitForCandleCount(mpage, 31);
await mpage.screenshot({ path: join(OUT_DIR, "mobile-chart-day.png"), fullPage: true });
await layoutAudit(mpage, "mobile");

// Month view also switches on mobile.
await mpage.click('text=月视图');
await waitForCandleCount(mpage, 24);
check(true, "mobile: month view renders 24 candles");

// AI panel is reachable and the key input is a password field.
await mpage.fill("#ai-key", "sk-demo-12345678");
const keyType = await mpage.getAttribute("#ai-key", "type");
check(keyType === "password", "mobile: API key input is masked", `type=${keyType}`);
const analyzeDisabled = await mpage
  .getByRole("button", { name: /请求 AI 解读/ })
  .first()
  .isDisabled();
check(!analyzeDisabled, "mobile: analyze button enabled with key + no boundary");
await mpage.screenshot({ path: join(OUT_DIR, "mobile-ai-panel.png"), fullPage: true });
await mobile.close();

await browser.close();

console.log(`\nScreenshots: ${OUT_DIR}`);
if (failures.length) {
  console.error(`\n${failures.length} check(s) failed:`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log("\nAll walkthrough checks passed.");
