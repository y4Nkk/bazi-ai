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

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const OUT_DIR = join(tmpdir(), "bazi-ui-walkthrough");
mkdirSync(OUT_DIR, { recursive: true });

const failures = [];
const check = (ok, label, detail = "") => {
  const line = `${ok ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`;
  console.log(line);
  if (!ok) failures.push(line);
};

async function fillBirthForm(page) {
  await page.fill("#birth-date", "1990-05-15");
  await page.fill("#birth-time", "14:00");
  await page.check('input[name="chart-gender"][value="male"]');
  await page.fill("#birthplace", "上海");
  await page.selectOption("#timezone", "Asia/Shanghai");
  await page.fill("#longitude", "121.47");
  await page.fill("#latitude", "31.23");
  await page.check('input[name="time-standard"][value="civil"]');
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
      if (el.classList.contains("sr-only")) continue;
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
await fillBirthForm(page);
await page.screenshot({ path: join(OUT_DIR, "desktop-initial.png") });

await page.click('button[type="submit"]');
await waitForCandleCount(page, 31);
await page.screenshot({ path: join(OUT_DIR, "desktop-chart-day.png"), fullPage: true });
check(true, "desktop: day view renders a month of candles", "count=31");

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
await page.selectOption("#dimension-select", "wealth");
await waitForCandleCount(page, 31);
await page.click('text=月视图');
await waitForCandleCount(page, 24);
check(true, "desktop: month view renders 24 candles");
const dimAfterSwitch = await page.inputValue("#dimension-select");
check(dimAfterSwitch === "wealth", "desktop: resolution switch preserves dimension", `dimension=${dimAfterSwitch}`);
await page.screenshot({ path: join(OUT_DIR, "desktop-chart-month.png"), fullPage: true });

await page.click('text=年视图');
await waitForCandleCount(page, 12);
check(true, "desktop: year view renders 12 candles");
await page.screenshot({ path: join(OUT_DIR, "desktop-chart-year.png"), fullPage: true });

await layoutAudit(page, "desktop");
await desktop.close();

/* ---------------- Mobile ---------------- */
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mpage = await mobile.newPage();
await mpage.goto(BASE_URL);
await mpage.waitForLoadState("domcontentloaded");
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
