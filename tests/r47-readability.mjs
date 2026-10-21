/* global document, window, getComputedStyle, requestAnimationFrame */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.TEST_BASE_URL ?? "http://localhost:4322";
const output = process.env.REVIEW_OUTPUT ?? "artifacts/r47-review/readability";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = [];
try {
  for (const lang of ["zh", "en"])
    for (const width of [320, 375, 768, 1024, 1280, 1440, 1920, 2560]) {
      const page = await browser.newPage({
        viewport: { width, height: width < 768 ? 812 : 1000 },
        reducedMotion: "reduce",
      });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(`${base}/${lang}/`, { waitUntil: "networkidle" });
      console.log(`Checking ${lang} ${width}`);
      const navigation = await page
        .locator(".desktop-navigation")
        .boundingBox();
      for (const index of [1, 3, 0]) {
        await page.locator(`[data-dot="${index}"]`).click();
        await page.waitForFunction(
          (i) =>
            document
              .querySelector(`[data-dot="${i}"]`)
              .classList.contains("on"),
          index,
        );
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
        );
        await page.waitForTimeout(100);
        const evidence = await page.evaluate(() => {
          const hero = document.querySelector("[data-carousel]"),
            nav = document.querySelector(".desktop-navigation"),
            copy = hero.querySelector(".hero-content");
          const rect = (e) => {
            const r = e.getBoundingClientRect();
            return {
              x: r.x,
              y: r.y,
              width: r.width,
              height: r.height,
              bottom: r.bottom,
              right: r.right,
            };
          };
          const contrast = (foreground, background) => {
            const lum = (rgb) =>
              rgb
                .match(/[\d.]+/g)
                .slice(0, 3)
                .map(Number)
                .map((v) => v / 255)
                .map((v) =>
                  v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
                )
                .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
            const a = lum(foreground),
              b = lum(background);
            return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          };
          return {
            overflow: document.documentElement.scrollWidth - window.innerWidth,
            nav: rect(nav),
            copy: rect(copy),
            stage: rect(hero.querySelector(".hero-stage")),
            navBackground: getComputedStyle(nav).backgroundColor,
            copyBackground: getComputedStyle(copy).backgroundColor,
            navContrast: contrast(
              getComputedStyle(nav.querySelector("a")).color,
              getComputedStyle(nav).backgroundColor,
            ),
            copyContrast: contrast(
              getComputedStyle(copy.querySelector("p")).color,
              getComputedStyle(copy).backgroundColor,
            ),
            imageFilter: getComputedStyle(hero.querySelector(".slide.on img"))
              .filter,
          };
        });
        assert(evidence.overflow <= 1);
        assert.equal(evidence.imageFilter, "none");
        if (width >= 1280) {
          assert(
            Math.abs(evidence.nav.x - navigation.x) < 1 &&
              Math.abs(evidence.nav.width - navigation.width) < 1,
            "Navigation does not jump between photographs",
          );
          assert.equal(evidence.navBackground, "rgb(245, 246, 244)");
          assert(evidence.navContrast >= 4.5);
          assert.equal(evidence.copyBackground, "rgb(245, 246, 244)");
          assert(evidence.copyContrast >= 4.5);
          assert(evidence.copy.bottom < evidence.stage.bottom);
          assert(
            evidence.copy.right < width * 0.3,
            "Copy stays beside the central building",
          );
        }
        results.push({ lang, width, index, ...evidence });
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
} finally {
  await browser.close();
}
await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
console.log(
  `${results.length} bilingual readability/theme/reset checks passed`,
);
