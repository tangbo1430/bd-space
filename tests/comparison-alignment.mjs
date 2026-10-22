/* global document, window */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4336";
const output =
  process.env.REVIEW_OUTPUT ?? "artifacts/r76-consistency/comparison";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ reducedMotion: "reduce" });
const report = { base, states: [], errors: [] };
page.on("pageerror", (e) => report.errors.push(e.message));
try {
  for (const lang of ["zh", "en"])
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`${base}/${lang}/products/`, {
        waitUntil: "domcontentloaded",
      });
      await page.evaluate(() => document.fonts.ready);
      const picker = page.locator('[data-comparison-select="0"]');
      for (const model of [
        "grayscale",
        "grayscale-eco",
        "4s",
        "5s",
        "6s",
        "bd8",
        "bd9",
      ]) {
        await picker.selectOption(model);
        const d = await page.evaluate(() => ({
          labels: [...document.querySelectorAll(".comparison-picker")].map(
            (e) => e.getBoundingClientRect().toJSON(),
          ),
          names: [...document.querySelectorAll("[data-comparison-name]")].map(
            (e) => e.textContent.trim(),
          ),
          link: document
            .querySelector('[data-comparison-link="0"]')
            .getAttribute("href"),
          overflow: document.documentElement.scrollWidth - window.innerWidth,
        }));
        assert.ok(d.overflow <= 1, `${lang} ${width} ${model}: overflow`);
        assert.ok(
          Math.abs(d.labels[0].bottom - d.labels[1].bottom) < 1,
          `${lang} ${width} ${model}: model picker baseline`,
        );
        assert.equal(d.link, `/${lang}/products/${model}/`);
        report.states.push({ lang, width, model, ...d });
        if (model === "grayscale-eco") {
          await page
            .locator("#product-comparison")
            .evaluate((e) =>
              e.scrollIntoView({ block: "start", behavior: "instant" }),
            );
          await page.screenshot({
            path: `${output}/${lang}-${width}.jpg`,
            quality: 84,
          });
        }
      }
    }
} catch (e) {
  report.errors.push(e.stack);
} finally {
  await browser.close();
  await writeFile(`${output}/results.json`, JSON.stringify(report, null, 2));
}
assert.deepEqual(report.errors, []);
console.log(`${report.states.length} model comparison states passed.`);
