/**
 * One-shot UI walkthrough: desktop (>=1068px) and mobile (<=419px) widths.
 * Fills the birth form, generates the chart, switches resolutions and
 * dimension, explores one native time-evidence period, and checks layout invariants (no horizontal
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

const HISTORY_AI_SUMMARY = "这是用于验证历史回显的 AI 解读，内容来自一次已完成的自带密钥请求。";
const HISTORY_AI_OUTPUT = {
  evidenceStatus: "insufficient",
  summary: HISTORY_AI_SUMMARY,
  summaryRuleIds: [],
  dimensionInterpretations: [],
  opportunities: ["先核对当前周期的确定性因素"],
  cautions: ["不要将文化娱乐解读当作现实决策依据"],
  selectedPeriod: {
    explanation: "当前规则无法确定该周期的具体倾向，因为所选周期没有可引用的确定性规则依据。",
    ruleIds: [],
  },
  disclaimer: "本解读属于传统文化与娱乐性质，不构成现实决策依据。",
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

/** The caption opens a bounded year grid, so historical birth years do not
 * require paging month-by-month. Date and time triggers must remain the same
 * shared control surface. */
async function checkDateAndTimePickers(page, label) {
  const triggerStyles = await page.evaluate(() => {
    const fields = ["birth-date", "birth-time"].map((id) => {
      const element = document.getElementById(id);
      if (!element) throw new Error(`Missing picker trigger: ${id}`);
      const style = getComputedStyle(element);
      return {
        id,
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        borderRadius: style.borderRadius,
        minHeight: style.minHeight,
      };
    });
    return { date: fields[0], time: fields[1] };
  });
  check(
    JSON.stringify(triggerStyles.date) === JSON.stringify({ ...triggerStyles.time, id: "birth-date" }),
    `${label}: date and time triggers share the global control style`,
    JSON.stringify(triggerStyles),
  );

  await page.click("#birth-date");
  await page.getByRole("button", { name: "选择年份", exact: true }).click();
  check(
    (await page.getByRole("button", { name: "上一组年份", exact: true }).count()) === 1 &&
      (await page.getByRole("button", { name: "下一组年份", exact: true }).count()) === 1,
    `${label}: date picker opens a year-selection panel`,
  );
  for (let index = 0; index < 3; index += 1) {
    await page.getByRole("button", { name: "上一组年份", exact: true }).click();
  }
  await page.getByRole("button", { name: "1990", exact: true }).click();
  check(
    (await page.getByRole("button", { name: "选择年份", exact: true }).count()) === 1,
    `${label}: selecting a year returns to that year's month calendar`,
  );
  await page.keyboard.press("Escape");
}

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Day view renders one candle per day of the run month (28–31). */
function daysInCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
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

async function waitForPeriodCount(page, exactCount, timeout = 180000) {
  await page.waitForSelector('section[aria-label="命理时间证据工作台"] svg[role="group"]', { timeout });
  await page.waitForFunction(
    (n) => document.querySelector('section[aria-label="命理时间证据工作台"] svg[role="group"]')
      ?.getAttribute("aria-label")
      ?.includes(`共 ${n} 个周期`) === true,
    exactCount,
    { timeout },
  );
}

/** Next dev can serve the document before its client CSS and hydration chunk.
 * Wait for the shared 44px control contract before exercising popovers. */
async function waitForInteractiveSurface(page) {
  await page.waitForFunction(() => {
    const trigger = document.getElementById("birth-date");
    return trigger !== null && Number.parseFloat(getComputedStyle(trigger).minHeight) >= 43.5;
  }, undefined, { timeout: 60000 });
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
const desktopErrors = [];
page.on("pageerror", (error) => desktopErrors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") desktopErrors.push(message.text());
});
await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForLoadState("domcontentloaded");
await page.waitForLoadState("networkidle");
await page.waitForSelector("#birth-date", { timeout: 60000 });
await waitForInteractiveSurface(page);
await checkDateAndTimePickers(page, "desktop");
await checkPlacePicker(page, "desktop");
await fillBirthForm(page);
await page.screenshot({ path: join(OUT_DIR, "desktop-initial.png") });

await page.click('button[type="submit"]');
await waitForPeriodCount(page, daysInCurrentMonth());
await page.screenshot({ path: join(OUT_DIR, "desktop-chart-day.png"), fullPage: true });
check(true, "desktop: day view renders a month of evidence candles", `count=${daysInCurrentMonth()}`);
await page.getByRole("tab", { name: "神煞注记", exact: true }).click();
const shenshaText = await page.locator('section[aria-label="专业细盘"]').textContent();
check(
  Boolean(shenshaText?.includes("参考")) || Boolean(shenshaText?.includes("日干")) || Boolean(shenshaText?.includes("月支")),
  "desktop: professional shensha facts expose their triggering reference",
);
check(
  Boolean(shenshaText?.includes("不参与日主旺衰、格局、喜忌、领域结论或趋势指数")),
  "desktop: shensha annotation boundary is visible",
);
await page.getByRole("tab", { name: "岁运细盘", exact: true }).click();
check(
  (await page.locator('section[aria-label="专业细盘"]').textContent())?.includes("收盘时刻对应的大运、流年、流月、流日与流时") === true,
  "desktop: aggregate period detail states its endpoint semantics",
);
await page.screenshot({ path: join(OUT_DIR, "desktop-professional-detail.png"), fullPage: true });

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

let analysisRequests = 0;
await page.route("**/api/analyze", async (route) => {
  analysisRequests += 1;
  await route.fulfill({ json: { analysis: HISTORY_AI_OUTPUT } });
});
await page.fill("#ai-key", "sk-history-demo");
await page.getByRole("button", { name: "请求 AI 解读", exact: true }).click();
await page.waitForSelector('[aria-label="AI 解读结果"]');
check(
  (await page.locator('[aria-label="AI 解读结果"]').textContent())?.includes(HISTORY_AI_SUMMARY),
  "desktop: a completed BYOK analysis is shown",
);

// A second explicit generation creates another record; reopening the first
// one restores its saved chart without a chart or AI request.
await page.fill("#subject-name", "回显记录");
await page.locator("#birth-form").getByRole("button", { name: "生成命盘", exact: true }).click();
await waitForPeriodCount(page, daysInCurrentMonth());
const historyRecords = page.locator('section[aria-labelledby="history-title"] button');
check(
  (await historyRecords.count()) === 2,
  "desktop: successful generations create separate history records",
  `records=${await historyRecords.count()}`,
);
await page.getByRole("button", { name: /未命名命盘/ }).click();
await waitForPeriodCount(page, daysInCurrentMonth());
const restoredHistoryDimension = (await page.locator("#dimension-select").textContent())?.trim();
check(
  restoredHistoryDimension === "综合",
  "desktop: selecting history restores its saved chart state",
  `dimension=${restoredHistoryDimension}`,
);
check(
  (await page.locator('[aria-label="AI 解读结果"]').textContent())?.includes(HISTORY_AI_SUMMARY) &&
    analysisRequests === 1,
  "desktop: selecting history replays the saved BYOK analysis without another request",
  `analysisRequests=${analysisRequests}`,
);

// One canvas is the focus target: keyboard selection updates the exact period evidence.
const evidencePanel = page.locator('[aria-label="所选周期证据"]');
const evidenceBefore = await evidencePanel.textContent();
const chartCanvas = page.locator('section[aria-label="命理时间证据工作台"] svg[role="group"]');
await chartCanvas.focus();
await page.keyboard.press("ArrowRight");
await page.waitForFunction(
  (previous) => document.querySelector('[aria-label="所选周期证据"]')?.textContent !== previous,
  evidenceBefore,
);
const evidenceAfter = await evidencePanel.textContent();
check(evidenceBefore !== evidenceAfter, "desktop: keyboard period selection updates the evidence inspector", `${evidenceBefore?.slice(0, 40)} → ${evidenceAfter?.slice(0, 40)}`);
await page.getByRole("button", { name: "放大图表" }).click();
await page.getByRole("button", { name: "重置图表缩放" }).click();
check(true, "desktop: native chart zoom controls are reachable");

// Resolution switching preserves the dimension.
await pickSelect(page, "dimension-select", "财运");
await waitForPeriodCount(page, daysInCurrentMonth());
await page.locator('input[name="resolution"][value="shichen"]').check({ force: true });
await waitForPeriodCount(page, 12);
check(
  (await evidencePanel.textContent())?.includes("精确时刻") === true,
  "desktop: shichen view exposes atomic evidence with an exact instant",
);
await page.locator('input[name="resolution"][value="month"]').check({ force: true });
await waitForPeriodCount(page, 24);
check(true, "desktop: month view renders 24 aggregate evidence candles");
const dimAfterSwitch = (await page.locator("#dimension-select").textContent())?.trim();
check(dimAfterSwitch === "财运", "desktop: resolution switch preserves dimension", `dimension=${dimAfterSwitch}`);
await page.screenshot({ path: join(OUT_DIR, "desktop-chart-month.png"), fullPage: true });

await page.locator('input[name="resolution"][value="year"]').check({ force: true });
// Year view aggregates up to 4400 days of deterministic points; dev compute
// measured ~131s, so this wait needs far more headroom than the default 45s.
await waitForPeriodCount(page, 12, 300000);
check(true, "desktop: year view renders 12 aggregate evidence candles");
await page.screenshot({ path: join(OUT_DIR, "desktop-chart-year.png"), fullPage: true });

// A refresh restores the cached chart (year view, 财运) without resubmitting.
await page.reload();
await page.waitForSelector('section[aria-label="出生信息摘要"]');
await waitForPeriodCount(page, 12, 300000);
const restoredDim = (await page.locator("#dimension-select").textContent())?.trim();
check(
  restoredDim === "财运",
  "desktop: refresh restores the cached chart without re-submitting",
  `candles=12 dimension=${restoredDim}`,
);
await page.screenshot({ path: join(OUT_DIR, "desktop-restored.png"), fullPage: true });

await layoutAudit(page, "desktop");
check(desktopErrors.length === 0, "desktop: no console or page errors", desktopErrors.join(" | "));

// A corrupted cache entry is discarded and the fresh form is shown.
await page.evaluate(() => window.localStorage.setItem("bazi.workbench.zp1", "{not json"));
await page.reload();
await page.waitForSelector("#birth-form");
check(true, "desktop: corrupted cache is discarded, fresh form shown");
await desktop.close();

/* ---------------- Mobile ---------------- */
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mpage = await mobile.newPage();
const mobileErrors = [];
mpage.on("pageerror", (error) => mobileErrors.push(error.message));
mpage.on("console", (message) => {
  if (message.type() === "error") mobileErrors.push(message.text());
});
await mpage.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
await mpage.waitForLoadState("domcontentloaded");
await mpage.waitForLoadState("networkidle");
await mpage.waitForSelector("#birth-date", { timeout: 60000 });
await waitForInteractiveSurface(mpage);
await checkPlacePicker(mpage, "mobile");
await checkDateAndTimePickers(mpage, "mobile");
await fillBirthForm(mpage);
await mpage.click('button[type="submit"]');
await waitForPeriodCount(mpage, daysInCurrentMonth());
await mpage.screenshot({ path: join(OUT_DIR, "mobile-chart-day.png"), fullPage: true });
await mpage.getByRole("tab", { name: "神煞注记", exact: true }).click();
await mpage.screenshot({ path: join(OUT_DIR, "mobile-professional-shensha.png"), fullPage: true });
await layoutAudit(mpage, "mobile");

// Month view also switches on mobile.
await mpage.locator('input[name="resolution"][value="month"]').check({ force: true });
await waitForPeriodCount(mpage, 24);
check(true, "mobile: month view renders 24 aggregate evidence candles");

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
check(mobileErrors.length === 0, "mobile: no console or page errors", mobileErrors.join(" | "));
await mobile.close();

await browser.close();

console.log(`\nScreenshots: ${OUT_DIR}`);
if (failures.length) {
  console.error(`\n${failures.length} check(s) failed:`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log("\nAll walkthrough checks passed.");
