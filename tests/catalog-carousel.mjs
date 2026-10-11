/* global document, innerWidth, getComputedStyle, Touch, TouchEvent */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4322";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const report = { layouts: [], errors: [], missing: [] };
const models = ["4s", "5s", "6s", "grayscale", "bd8", "bd9"];
await mkdir("artifacts/catalog-carousel", { recursive: true });
for (const lang of ["zh", "en"])
  for (const [width, height] of [
    [320, 812],
    [375, 812],
    [768, 1024],
    [1024, 768],
    [1440, 900],
    [2560, 1080],
    [812, 375],
    [720, 450],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      reducedMotion: "no-preference",
      hasTouch: true,
    });
    page.on("pageerror", (e) => report.errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400) report.missing.push(r.url());
    });
    await page.goto(`${base}/${lang}/products/`, { waitUntil: "networkidle" });
    assert.equal(await page.locator("[data-slide]").count(), 6);
    await page.locator("[data-carousel-pause]").click();
    for (let i = 0; i < 6; i++) {
      await page.locator(`[data-dot="${i}"]`).click();
      assert.equal(
        await page.locator(".slide.on").getAttribute("data-product"),
        models[i],
      );
      assert.equal(
        await page.locator(".slide.on .hero-explore").getAttribute("href"),
        `/${lang}/products/${models[i]}/`,
      );
      await page.locator(".slide.on img").evaluate((i) => i.decode());
      assert.equal(
        await page
          .locator(".slide.on img")
          .evaluate((i) => getComputedStyle(i).objectFit),
        "cover",
      );
    }
    await page.keyboard.press("ArrowRight");
    assert.equal(
      await page.locator(".slide.on").getAttribute("data-product"),
      "4s",
    );
    await page.keyboard.press("ArrowLeft");
    assert.equal(
      await page.locator(".slide.on").getAttribute("data-product"),
      "bd9",
    );
    await page.keyboard.press("Home");
    await page.waitForFunction(
      () =>
        getComputedStyle(document.querySelector(".slide.on")).opacity === "1",
    );
    await page.locator('[data-dot="0"]').blur();
    const geometry = await page.evaluate(() => {
      const box = (s) => document.querySelector(s).getBoundingClientRect();
      const controls = box(".hero-controls"),
        caption = box(".slide.on .hero-bottom"),
        actions = box(".cover-actions"),
        hero = box(".catalog-hero");
      const overlap = (a, b) =>
        a.left < b.right &&
        a.right > b.left &&
        a.top < b.bottom &&
        a.bottom > b.top;
      return {
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        overlap:
          overlap(controls, caption) ||
          overlap(controls, actions) ||
          overlap(caption, actions),
        clipped:
          controls.bottom > hero.bottom ||
          controls.left < 0 ||
          controls.right > innerWidth,
        targets: [
          ...document.querySelectorAll(".hero-scene,.hero-pause"),
        ].every(
          (e) =>
            e.getBoundingClientRect().width >= 44 &&
            e.getBoundingClientRect().height >= 44,
        ),
      };
    });
    assert.ok(
      !geometry.overflow &&
        !geometry.overlap &&
        !geometry.clipped &&
        geometry.targets,
      JSON.stringify({ lang, width, ...geometry }),
    );
    if ([375, 2560].includes(width))
      await page.screenshot({
        path: `artifacts/catalog-carousel/${lang}-${width}.png`,
      });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator("[data-carousel-pause]").waitFor({ state: "hidden" });
    assert.equal(
      await page.locator("[data-carousel-pause]").isVisible(),
      false,
    );
    await page.locator(".catalog-hero").evaluate((hero) => {
      const touch = new Touch({
        identifier: 1,
        target: hero,
        clientX: 250,
        clientY: 300,
      });
      hero.dispatchEvent(
        new TouchEvent("touchstart", { touches: [touch], bubbles: true }),
      );
      const end = new Touch({
        identifier: 1,
        target: hero,
        clientX: 100,
        clientY: 300,
      });
      hero.dispatchEvent(
        new TouchEvent("touchend", { changedTouches: [end], bubbles: true }),
      );
    });
    assert.equal(
      await page.locator(".slide.on").getAttribute("data-product"),
      "5s",
    );
    report.layouts.push({ lang, width, height, ...geometry });
    await page.close();
  }
const auto = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "no-preference",
});
await auto.goto(`${base}/zh/products/`, { waitUntil: "networkidle" });
await auto.waitForFunction(
  () =>
    document.querySelector(".slide.on").getAttribute("data-product") === "5s",
  {},
  { timeout: 15000 },
);
report.autoplay = true;
await browser.close();
assert.deepEqual(report.errors, []);
assert.deepEqual(report.missing, []);
await writeFile(
  "artifacts/catalog-carousel-audit.json",
  JSON.stringify(report, null, 2),
);
console.log(
  "16 catalog layouts, six slides, links, wraparound, touch, reduced motion and real autoplay passed.",
);
