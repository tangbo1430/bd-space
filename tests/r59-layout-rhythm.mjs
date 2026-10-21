/* global document, window, getComputedStyle */
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4336";
const out = process.env.REVIEW_OUTPUT ?? "artifacts/r59-refinement/rhythm";
await mkdir(out, { recursive: true });
const report = { layouts: [], axe: [], resize: [], errors: [] };
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  for (const lang of ["zh", "en"])
    for (const width of [375, 768, 1440, 1920]) {
      const context = await browser.newContext({
        viewport: { width, height: width === 375 ? 812 : 1080 },
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      page.on("pageerror", (e) => report.errors.push(e.message));
      await page.goto(`${base}/${lang}/`, { waitUntil: "networkidle" });
      await page.locator(".h-products img,.h-systems img").evaluateAll((imgs) =>
        Promise.all(
          imgs.map((i) => {
            i.loading = "eager";
            return i.decode();
          }),
        ),
      );
      const state = await page.evaluate(() => ({
        colors: [
          ".h-tile:nth-child(2)",
          ".h-collection-footer",
          ".h-systems",
          ".h-making",
        ].map(
          (sel) =>
            getComputedStyle(document.querySelector(sel)).backgroundColor,
        ),
        gutter: getComputedStyle(document.querySelector(".h-tiles")).gap,
        images: [...document.querySelectorAll(".h-products img")].map((i) => ({
          ratio: Math.abs(
            i.height - (i.width * i.naturalHeight) / i.naturalWidth,
          ),
          filter: getComputedStyle(i).filter,
        })),
        overflow: document.documentElement.scrollWidth - window.innerWidth,
      }));
      assert.deepEqual(state.colors, [
        "rgb(255, 255, 255)",
        "rgb(255, 255, 255)",
        "rgb(244, 244, 242)",
        "rgb(12, 19, 16)",
      ]);
      assert.equal(state.gutter, "2px");
      assert(state.overflow <= 1);
      assert(state.images.every((i) => i.ratio < 1.5 && i.filter === "none"));
      for (const [name, sel] of [
        ["junction", ".h-products"],
        ["pair", ".h-tile:nth-child(2)"],
        ["systems", ".h-systems"],
        ["making", ".h-making"],
      ]) {
        await page
          .locator(sel)
          .evaluate(
            (e, name) =>
              window.scrollTo(
                0,
                window.scrollY +
                  e.getBoundingClientRect().top -
                  (name === "junction" ? 220 : 80),
              ),
            name,
          );
        await page.locator(sel + " img").evaluateAll((imgs) =>
          Promise.all(
            imgs.map((i) => {
              i.loading = "eager";
              return i.decode();
            }),
          ),
        );
        await page.waitForTimeout(100);
        await page.screenshot({
          path: `${out}/${lang}-${width}-${name}.jpg`,
          quality: 88,
        });
      }
      if ([375, 1440].includes(width)) {
        await page.locator(".h-systems").scrollIntoViewIfNeeded();
        const a = await new AxeBuilder({ page })
          .include(".h-systems")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        report.axe.push({ lang, width, violations: a.violations });
        assert.deepEqual(a.violations, []);
      }
      report.layouts.push({ lang, width, ...state });
      await context.close();
    }
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    reducedMotion: "reduce",
  });
  await page.goto(`${base}/zh/`, { waitUntil: "networkidle" });
  await page.locator('[data-dot="1"]').click();
  for (const [width, height, brand, fit] of [
    [1920, 1080, "light", "cover"],
    [1920, 900, "dark", "contain"],
    [1440, 1000, "light", "cover"],
    [2560, 1440, "light", "cover"],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(150);
    assert.equal(
      await page.locator(".gnb").getAttribute("data-brand-tone"),
      brand,
    );
    assert.equal(
      await page
        .locator(".slide.on img")
        .evaluate((i) => getComputedStyle(i).objectFit),
      fit,
    );
    report.resize.push({ width, height, brand, fit });
  }
  await page.close();
  assert.deepEqual(report.errors, []);
} catch (e) {
  report.errors.push(e.stack);
  process.exitCode = 1;
} finally {
  await browser.close();
  await writeFile(`${out}/results.json`, JSON.stringify(report, null, 2));
}
console.log(
  JSON.stringify({
    layouts: report.layouts.length,
    axe: report.axe.length,
    resize: report.resize.length,
    errors: report.errors,
  }),
);
