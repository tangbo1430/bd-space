import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4322";
const routes = [
  "",
  "products/",
  "products/4s/",
  "products/5s/",
  "products/6s/",
  "products/grayscale/",
  "products/bd8/",
  "products/bd9/",
  "cases/",
  "about/",
  "contact/",
];
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  reducedMotion: "reduce",
  acceptDownloads: true,
});
const page = await context.newPage();
const report = {
  layouts: [],
  accessibility: [],
  interactions: [],
  errors: [],
  missing: [],
};
page.on("pageerror", (e) => report.errors.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 400) report.missing.push(r.url());
});
await mkdir("artifacts/v11", { recursive: true });
for (const [width, height] of [
  [320, 568],
  [375, 812],
  [768, 1024],
  [1024, 768],
  [1440, 900],
  [1920, 1080],
  [844, 390],
  [720, 450],
]) {
  await page.setViewportSize({ width, height });
  for (const route of routes) {
    await page.goto(`${base}/en/${route}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator("html").getAttribute("lang"), "en");
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${route} ${width}: overflow`,
    );
    const language = page.locator("[data-language-link]").first();
    assert.equal(await language.getAttribute("href"), `/zh/${route}`);
    const chinese = await page.locator("body").innerText();
    assert(
      !/[\u3400-\u9fff]/.test(chinese.replaceAll("中文", "")),
      `${route}: untranslated copy`,
    );
    assert.equal(await page.locator('nav a[href^="/zh/"]').count(), 0);
    if ([375, 1440].includes(width)) {
      const a = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      report.accessibility.push({ route, width, violations: a.violations });
      await page.screenshot({
        path: `artifacts/v11/en-${route.replaceAll("/", "-") || "home"}-${width}.png`,
      });
    }
    report.layouts.push({ route, width, height, overflow: false });
  }
}
await writeFile(
  "artifacts/v11-layout-audit.json",
  JSON.stringify(report, null, 2),
);
await page.setViewportSize({ width: 1440, height: 900 });
await page.emulateMedia({ reducedMotion: "no-preference" });
for (const route of ["/zh/", "/zh/products/", "/en/", "/en/products/"]) {
  await page.goto(base + route, { waitUntil: "networkidle" });
  const root = page.locator("[data-carousel]");
  assert.equal(
    await root.locator("[data-slide]").count(),
    route.includes("products") ? 6 : 3,
  );
  assert.equal((await root.locator(".hero-scenes").innerText()).trim(), "");
  await root.locator('[data-dot="2"]').click();
  assert.equal(await root.locator("[data-hero-current]").textContent(), "03");
  await root.locator('[data-dot="2"]').focus();
  await page.keyboard.press("Home");
  assert.equal(await root.locator("[data-hero-current]").textContent(), "01");
  await root.locator("[data-carousel-pause]").click();
  assert.equal(
    await root.locator("[data-carousel-pause]").getAttribute("aria-pressed"),
    "true",
  );
  report.interactions.push(
    `${route}: no-text controls, keyboard, selection and pause`,
  );
}
for (const id of ["4s", "5s", "6s", "grayscale", "bd8", "bd9"]) {
  await page.goto(`${base}/en/products/${id}/`, { waitUntil: "networkidle" });
  const trigger = page.locator(`[data-gallery="${id}-diagrams"]`).first();
  const count = await page.locator(`[data-gallery="${id}-diagrams"]`).count();
  await trigger.click();
  await page.locator(".viewer-image").evaluate((e) => e.decode());
  assert.equal(
    await page.locator("[data-viewer-count]").textContent(),
    `01 / ${String(count).padStart(2, "0")}`,
  );
  await page.locator("[data-viewer-zoom]").click();
  assert.equal(
    await page.locator("[data-viewer-zoom]").getAttribute("aria-label"),
    "Fit whole image",
  );
  await page.keyboard.press("Escape");
  assert(await trigger.evaluate((e) => document.activeElement === e));
  report.interactions.push(
    `${id}: separate technical group, zoom, focus restoration`,
  );
}
const videoPage = await browser.newPage();
let videoRequests = 0;
videoPage.on("request", (r) => {
  if (r.url().endsWith(".mp4")) videoRequests++;
});
await videoPage.goto(`${base}/en/products/4s/`, { waitUntil: "networkidle" });
await videoPage.locator("video").scrollIntoViewIfNeeded();
await videoPage.waitForTimeout(500);
assert.equal(videoRequests, 0, "video must not download before manual play");
await videoPage.locator("video").evaluate((v) => v.play());
await videoPage.waitForFunction(
  () => document.querySelector("video").currentTime > 0,
);
assert(videoRequests > 0);
await videoPage.close();
report.interactions.push(
  "4S video: zero pre-play requests; manual playback works",
);
await page.goto(`${base}/en/contact/?product=bd9`, {
  waitUntil: "networkidle",
});
assert((await page.locator("textarea").inputValue()).includes("BD-9"));
await page.locator("[data-download-inquiry]").click();
assert(
  (await page.locator("[data-msg]").allTextContents())
    .join(" ")
    .includes("Please enter your name"),
);
await page.locator('[name="name"]').fill("Alex 王先生");
await page.locator('[name="contact"]').fill("+61 412 345 678");
const download = page.waitForEvent("download");
await page.locator("[data-download-inquiry]").click();
const file = await download;
const text = await readFile(await file.path(), "utf8");
assert(
  text.includes("Alex 王先生"),
  "authored user input must remain unchanged",
);
assert(text.includes("has not been sent"));
report.interactions.push(
  "English enquiry: product prefill, validation, international phone and local download",
);
await writeFile(
  "artifacts/v11-browser-audit.json",
  JSON.stringify(report, null, 2),
);
await browser.close();
assert.equal(report.errors.length, 0);
assert.equal(report.missing.length, 0);
assert(
  report.accessibility.every((a) => a.violations.length === 0),
  JSON.stringify(report.accessibility.filter((a) => a.violations.length)),
);
console.log(
  `${report.layouts.length} bilingual layouts, ${report.accessibility.length} accessibility scenarios and ${report.interactions.length} interaction groups passed.`,
);
