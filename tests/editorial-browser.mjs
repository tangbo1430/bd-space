import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const base = process.env.TEST_BASE_URL ?? "http://localhost:4321";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const report = {
  responsive: [],
  accessibility: [],
  interactions: [],
  errors: [],
};
const output = new URL("../artifacts/", import.meta.url);
await mkdir(output, { recursive: true });
const routes = [
  "/zh/",
  "/zh/products/",
  "/zh/products/4s/",
  "/zh/products/5s/",
  "/zh/products/6s/",
  "/zh/products/grayscale/",
  "/zh/products/bd8/",
  "/zh/products/bd9/",
  "/zh/products/slab/",
  "/zh/products/wall/",
  "/zh/products/stair/",
  "/zh/about/",
  "/zh/about/careers/",
  "/zh/about/investors/",
  "/zh/cases/",
  "/zh/contact/",
  "/zh/news/",
  "/zh/qualifications/",
  "/zh/privacy/",
  "/zh/cookies/",
  "/en/",
  ...[
    "products",
    "products/4s",
    "products/5s",
    "products/6s",
    "products/grayscale",
    "products/bd8",
    "products/bd9",
    "about",
    "contact",
    "cases",
  ].map((p) => `/en/${p}/`),
  "/404",
];
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
  acceptDownloads: true,
});
const page = await context.newPage();
page.on("pageerror", (e) => report.errors.push(e.message));
const interactionsOnly = process.env.TEST_INTERACTIONS_ONLY === "1";
for (const width of interactionsOnly ? [] : [320, 375, 768, 1024, 1440, 1920]) {
  await page.setViewportSize({ width, height: width < 768 ? 812 : 900 });
  for (const route of routes) {
    const response = await page.goto(base + route, {
      waitUntil: "domcontentloaded",
    });
    assert(response?.status() < 500, `server error on ${route}`);
    await page.evaluate(async () => {
      await document.fonts.ready;
      const images = [...document.images];
      images.forEach((i) => (i.loading = "eager"));
      await Promise.all(images.map((i) => i.decode().catch(() => {})));
    });
    const state = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      broken: [...document.images]
        .filter((i) => !i.complete || !i.naturalWidth)
        .map((i) => i.currentSrc),
      h1: document.querySelectorAll("h1").length,
    }));
    report.responsive.push({ route, width, ...state });
    assert(!state.overflow, `${route} overflows at ${width}`);
    assert.equal(
      state.broken.length,
      0,
      `${route} has broken assets at ${width}`,
    );
    assert.equal(state.h1, 1, `${route} needs one main heading`);
  }
  console.log(
    `Responsive checks passed at ${width}px (${routes.length} routes)`,
  );
}
for (const width of interactionsOnly ? [] : [1440, 375]) {
  await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
  for (const route of [
    "/zh/",
    "/zh/products/",
    "/zh/products/4s/",
    "/zh/about/",
    "/zh/cases/",
    "/zh/contact/",
    "/zh/news/",
    "/zh/qualifications/",
    "/zh/about/careers/",
    "/zh/about/investors/",
  ]) {
    await page.goto(base + route, { waitUntil: "networkidle" });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    report.accessibility.push({
      route,
      width,
      violations: results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    });
  }
}
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(base + "/zh/", { waitUntil: "networkidle" });
await page.locator('[data-dot="1"]').click();
assert.equal(await page.locator("[data-hero-current]").textContent(), "02");
await page.locator('[data-dot="0"]').click();
assert.equal(await page.locator("[data-hero-current]").textContent(), "01");
await page.locator("[data-carousel]").press("ArrowLeft");
assert.equal(await page.locator("[data-hero-current]").textContent(), "03");
await page.locator('[data-product-tab="5s"]').click();
assert.equal(
  await page.locator("[data-product-link]").getAttribute("href"),
  "/zh/products/5s/",
);
await page.locator('[data-product-tab="5s"]').press("ArrowRight");
assert.equal(
  await page.locator('[data-product-tab="6s"]').getAttribute("aria-selected"),
  "true",
);
await page.locator("[data-making-toggle]").nth(2).click();
assert.equal(
  await page
    .locator("[data-making-toggle]")
    .nth(2)
    .getAttribute("aria-expanded"),
  "true",
);
await page.locator("[data-sub-trigger]").hover();
await page.locator("[data-sub-panel]").waitFor({ state: "visible" });
assert(
  await page
    .locator('[data-sub-panel] a[href="/zh/about/careers/"]')
    .isVisible(),
);
report.interactions.push(
  "Manual carousel, reduced-motion controls, product tabs and arrow keys, manufacturing accordion, desktop navigation",
);
await page.goto(base + "/zh/cases/", { waitUntil: "networkidle" });
await page.locator('[data-case-filter="overseas"]').click();
assert.equal(await page.locator("[data-case-region]:visible").count(), 3);
await page.locator('[data-case-filter="domestic"]').click();
assert.equal(await page.locator("[data-case-region]:visible").count(), 7);
await page.locator('[data-case-filter="all"]').click();
assert.equal(await page.locator("[data-case-region]:visible").count(), 10);
report.interactions.push("Case filtering changes both visibility and status");
const caymanCount = String(
  await page.locator('[data-gallery="cayman"]').count(),
).padStart(2, "0");
await page.locator('[data-gallery="cayman"]').first().click();
assert.equal(
  await page.locator("[data-viewer-count]").textContent(),
  `01 / ${caymanCount}`,
);
await page.locator("[data-viewer-next]").click();
assert.equal(
  await page.locator("[data-viewer-count]").textContent(),
  `02 / ${caymanCount}`,
);
await page.keyboard.press("Escape");
assert(await page.locator("[data-photo-viewer]").isHidden());
for (const viewport of [
  { width: 1440, height: 900 },
  { width: 375, height: 812 },
  { width: 812, height: 375 },
  { width: 320, height: 568 },
]) {
  await page.setViewportSize(viewport);
  await page.goto(base + "/zh/products/4s/", { waitUntil: "networkidle" });
  const totalPhotos = String(
    await page.locator('[data-gallery="4s"]').count(),
  ).padStart(2, "0");
  const trigger = page.locator('[data-gallery="4s"]').first();
  await trigger.click();
  const dialog = page.locator("[data-photo-viewer]");
  assert(await dialog.evaluate((el) => el.open));
  await page.locator(".viewer-image").evaluate((el) => el.decode());
  await page.locator("[data-viewer-zoom]").click();
  assert.equal(
    await page.locator("[data-viewer-zoom]").getAttribute("aria-pressed"),
    "true",
  );
  assert(
    await page
      .locator("[data-viewer-image]")
      .evaluate((el) => el.scrollWidth > el.clientWidth),
  );
  await page.waitForTimeout(100);
  assert(
    await page
      .locator("[data-viewer-image]")
      .evaluate((el) => document.activeElement === el),
  );
  const panStart = await page
    .locator("[data-viewer-image]")
    .evaluate((el) => el.scrollLeft);
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(250);
  assert(
    (await page
      .locator("[data-viewer-image]")
      .evaluate((el) => el.scrollLeft)) < panStart,
  );
  assert.equal(
    await page.locator("[data-viewer-count]").textContent(),
    `01 / ${totalPhotos}`,
  );
  assert(
    (
      await page.locator("[data-viewer-original]").getAttribute("href")
    ).endsWith("v11-4s-hero.jpg"),
  );
  await page.locator("[data-viewer-zoom]").click();
  assert.equal(
    await page.locator("[data-viewer-count]").textContent(),
    `01 / ${totalPhotos}`,
  );
  await page.keyboard.press("ArrowRight");
  assert.equal(
    await page.locator("[data-viewer-count]").textContent(),
    `02 / ${totalPhotos}`,
  );
  await page.locator("[data-viewer-thumbnails] button").nth(2).click();
  assert.equal(
    await page.locator("[data-viewer-count]").textContent(),
    `03 / ${totalPhotos}`,
  );
  await page.locator(".viewer-image").evaluate((el) => el.decode());
  assert(
    await dialog.evaluate(
      (el) => el.scrollWidth <= innerWidth && el.scrollHeight <= innerHeight,
    ),
  );
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  report.accessibility.push({
    route: "/zh/products/4s/#viewer",
    width: viewport.width,
    height: viewport.height,
    violations: axe.violations,
  });
  if (viewport.width === 375) {
    await page.locator("[data-viewer-stage]").evaluate((el) => {
      const start = new Touch({
        identifier: 1,
        target: el,
        clientX: 280,
        clientY: 300,
      });
      const end = new Touch({
        identifier: 1,
        target: el,
        clientX: 110,
        clientY: 305,
      });
      el.dispatchEvent(new TouchEvent("touchstart", { touches: [start] }));
      el.dispatchEvent(new TouchEvent("touchend", { changedTouches: [end] }));
    });
    assert.equal(
      await page.locator("[data-viewer-count]").textContent(),
      `04 / ${totalPhotos}`,
    );
  }
  await page.keyboard.press("Escape");
  assert(await dialog.isHidden());
  assert(await trigger.evaluate((el) => document.activeElement === el));
  assert.equal(await page.evaluate(() => document.body.style.overflow), "");
}
report.interactions.push(
  "Full-screen photographs: zoom and native panning, original image, project grouping, thumbnails, keyboard, touch, Escape and focus restoration; desktop, mobile and landscape layouts",
);
await page
  .locator("[data-gallery]")
  .first()
  .evaluate((el) => {
    el.dataset.gallerySource = "/assets/img/unavailable-test-image.webp";
  });
await page.locator("[data-gallery]").first().click();
await page
  .locator("[data-viewer-loading]")
  .filter({ hasText: "图片暂时无法加载" })
  .waitFor();
await page.keyboard.press("Escape");
const noScript = await browser.newPage({
  javaScriptEnabled: false,
  viewport: { width: 375, height: 812 },
});
await noScript.goto(base + "/zh/products/4s/", { waitUntil: "networkidle" });
const photoHref = await noScript
  .locator("[data-gallery]")
  .first()
  .getAttribute("href");
const photoResponse = await noScript.goto(base + photoHref);
assert.equal(photoResponse.status(), 200);
await noScript.close();
report.interactions.push(
  "Photograph loading failures give clear feedback; original photos remain accessible without JavaScript",
);
await page.goto(base + "/zh/products/", { waitUntil: "networkidle" });
await page.locator('label[for="system-modules"]').click();
assert(await page.locator('[data-system-figure="modules"]').isVisible());
await page.locator("#system-modules").focus();
await page.keyboard.press("ArrowRight");
assert(await page.locator("#system-hybrid").isChecked());
assert(await page.locator('[data-system-figure="hybrid"]').isVisible());
assert.equal(await page.locator("[data-system-figure]:visible").count(), 1);
const staticSystems = await browser.newPage({
  javaScriptEnabled: false,
  viewport: { width: 375, height: 812 },
});
await staticSystems.goto(base + "/zh/products/", { waitUntil: "networkidle" });
await staticSystems.locator('label[for="system-modules"]').click();
assert(
  await staticSystems.locator('[data-system-figure="modules"]').isVisible(),
);
await staticSystems.close();
report.interactions.push(
  "Construction systems switch with pointer and native radio arrow keys, including without JavaScript",
);
await page.setViewportSize({ width: 375, height: 812 });
await page.goto(base + "/zh/", { waitUntil: "networkidle" });
assert(await page.locator(".slide.on .hero-explore").isVisible());
assert.equal(
  await page.locator(".slide.on .hero-explore").getAttribute("href"),
  "/zh/products/6s/",
);
await page.locator("[data-drawer-open]").click();
assert.equal(
  await page.locator("[data-drawer]").getAttribute("aria-hidden"),
  "false",
);
assert(await page.locator("main").evaluate((e) => e.inert));
await page.locator("[data-sub-trigger-mobile]").click();
assert(await page.locator(".p-sub-items a").first().isVisible());
await page.keyboard.press("Escape");
assert.equal(
  await page.locator("[data-drawer-open]").getAttribute("aria-expanded"),
  "false",
);
assert(
  await page
    .locator("[data-drawer-open]")
    .evaluate((e) => document.activeElement === e),
);
report.interactions.push(
  "Mobile menu expansion, background inertness and Escape focus return",
);
await page.locator("[data-drawer-open]").click();
await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(100);
assert.equal(
  await page.locator("[data-drawer]").getAttribute("aria-hidden"),
  "true",
);
assert(await page.locator("main").evaluate((el) => !el.inert));
assert.equal(await page.evaluate(() => document.body.style.overflow), "");
assert(
  await page
    .locator(".gnb .logo")
    .evaluate((el) => document.activeElement === el),
);
await page.setViewportSize({ width: 375, height: 812 });
report.interactions.push(
  "Mobile hero keeps its product link; resizing an open mobile menu to desktop restores scrolling and focus",
);
await page.goto(base + "/zh/contact/?product=5s", { waitUntil: "networkidle" });
assert(
  (await page.locator('[name="message"]').inputValue()).includes("半打 5S"),
);
await page.locator("[data-download-inquiry]").click();
assert(
  await page
    .locator('[data-field="name"]')
    .evaluate((e) => e.classList.contains("err")),
);
await page.locator('[name="name"]').fill("测试用户");
await page.locator('[name="contact"]').fill("test@example.com");
await page.locator('[name="message"]').fill("测试项目需求：住宅空间");
const pendingDownload = page.waitForEvent("download");
await page.locator("[data-download-inquiry]").click();
const download = await pendingDownload;
assert.equal(download.suggestedFilename(), "半打空间-项目需求.txt");
await download.saveAs(fileURLToPath(new URL("inquiry-test.txt", output)));
assert(
  (await page.locator("[data-download-status]").textContent()).includes(
    "尚未发送",
  ),
);
assert(await page.locator("[data-form-success]").isHidden());
await page.locator('[name="message"]').fill("更新后的项目需求");
assert(
  (await page.locator("[data-download-status]").textContent()).includes(
    "内容已修改",
  ),
);
assert.equal(
  await page.locator("[data-message-count]").textContent(),
  "8 / 1000",
);
report.interactions.push(
  "Product inquiry prefill, field validation and local download without false submission",
);
const motionPage = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "no-preference",
});
motionPage.on("pageerror", (e) => report.errors.push(e.message));
await motionPage.goto(base + "/zh/", { waitUntil: "networkidle" });
const first = await motionPage.locator("[data-hero-current]").textContent();
await motionPage.waitForTimeout(5400);
assert.notEqual(
  await motionPage.locator("[data-hero-current]").textContent(),
  first,
);
await motionPage.locator("[data-carousel-pause]").click();
await motionPage.mouse.move(10, 10);
const paused = await motionPage.locator("[data-hero-current]").textContent();
await motionPage.waitForTimeout(5400);
assert.equal(
  await motionPage.locator("[data-hero-current]").textContent(),
  paused,
);
report.interactions.push(
  "Real autoplay advances; explicit pause remains paused after pointer leaves",
);
await motionPage.locator("[data-carousel-pause]").click();
await motionPage.mouse.move(10, 10);
await motionPage.waitForTimeout(1800);
await motionPage.evaluate(() => window.scrollTo(0, 2200));
await motionPage.waitForTimeout(200);
assert(
  await motionPage
    .locator("[data-carousel]")
    .evaluate((el) => el.classList.contains("paused")),
);
const offscreen = await motionPage.locator("[data-hero-current]").textContent();
await motionPage.waitForTimeout(5400);
assert.equal(
  await motionPage.locator("[data-hero-current]").textContent(),
  offscreen,
);
await motionPage.evaluate(() => window.scrollTo(0, 0));
await motionPage.waitForTimeout(3600);
assert.notEqual(
  await motionPage.locator("[data-hero-current]").textContent(),
  offscreen,
);
report.interactions.push(
  "Offscreen carousel suspends its timer and resumes the remaining interval when visible",
);
await motionPage.emulateMedia({ reducedMotion: "reduce" });
await motionPage.waitForTimeout(100);
assert.equal(
  await motionPage.locator("html").getAttribute("data-motion"),
  "off",
);
const reducedFrame = await motionPage
  .locator("[data-hero-current]")
  .textContent();
await motionPage.waitForTimeout(5300);
assert.equal(
  await motionPage.locator("[data-hero-current]").textContent(),
  reducedFrame,
);
await motionPage.locator(`[data-dot="${Number(reducedFrame) % 3}"]`).click();
assert.notEqual(
  await motionPage.locator("[data-hero-current]").textContent(),
  reducedFrame,
);
await motionPage.emulateMedia({ reducedMotion: "no-preference" });
await motionPage.mouse.move(10, 10);
await motionPage.waitForTimeout(100);
assert.equal(
  await motionPage.locator("html").getAttribute("data-motion"),
  "auto",
);
report.interactions.push(
  "Changing reduced-motion preferences while browsing immediately stops autoplay while retaining manual controls",
);
await motionPage.close();
await writeFile(
  new URL(
    interactionsOnly ? "interaction-audit.json" : "browser-audit.json",
    output,
  ),
  JSON.stringify(report, null, 2),
);
await browser.close();
assert.equal(report.errors.length, 0, "No browser script errors");
console.log(
  JSON.stringify(
    {
      responsiveChecks: report.responsive.length,
      interactions: report.interactions,
      accessibilityViolations: report.accessibility.filter(
        (a) => a.violations.length,
      ),
    },
    null,
    2,
  ),
);
assert.equal(
  report.accessibility.filter((a) => a.violations.length).length,
  0,
  "Accessibility checks must pass",
);
