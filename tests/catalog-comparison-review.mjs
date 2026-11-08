/* global document, window, getComputedStyle */
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.env.TEST_URL || "http://127.0.0.1:4354";
const out = "artifacts/r87-review";
const report = { states: [], accessibility: [], errors: [] };
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "msedge" });
try {
  for (const lang of ["zh", "en"])
    for (const width of [320, 375, 768, 1024, 1280, 1440, 1920, 2560]) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      page.on("pageerror", (e) => report.errors.push(e.message));
      await page.goto(`${base}/${lang}/products/`, {
        waitUntil: "networkidle",
      });
      await page.evaluate(() => document.fonts.ready);
      const models = JSON.parse(
        await page.locator("[data-comparison-models]").textContent(),
      );
      for (const side of [0, 1])
        for (const model of models) {
          const other = 1 - side;
          const unchanged = await page
            .locator(`[data-comparison-name="${other}"]`)
            .textContent();
          const unchangedLink = await page
            .locator(`[data-comparison-link="${other}"]`)
            .getAttribute("href");
          await page
            .locator(`[data-comparison-select="${side}"]`)
            .selectOption(model.id);
          assert.equal(
            (
              await page
                .locator(`[data-comparison-name="${side}"]`)
                .textContent()
            ).trim(),
            model.name,
          );
          assert.equal(
            await page
              .locator(`[data-comparison-link="${side}"]`)
              .getAttribute("href"),
            model.href,
          );
          assert.equal(
            await page
              .locator(`[data-comparison-name="${other}"]`)
              .textContent(),
            unchanged,
          );
          assert.equal(
            await page
              .locator(`[data-comparison-link="${other}"]`)
              .getAttribute("href"),
            unchangedLink,
          );
          for (let row = 0; row < model.facts.length; row++)
            assert.equal(
              (
                await page
                  .locator(`[data-comparison-value="${side}-${row}"]`)
                  .textContent()
              ).trim(),
              model.facts[row].value,
            );
          const g = await page.evaluate(() => {
            const rects = [
              ...document.querySelectorAll(".comparison-picker"),
            ].map((e) => e.getBoundingClientRect());
            const cells = [
              ...document.querySelectorAll(".product-comparison thead th"),
            ]
              .slice(1)
              .map((e) => ({
                width: e.getBoundingClientRect().width,
                background: getComputedStyle(e).backgroundColor,
              }));
            return {
              offset: Math.abs(rects[0].bottom - rects[1].bottom),
              cells,
              overflow:
                document.documentElement.scrollWidth - window.innerWidth,
            };
          });
          assert.ok(
            g.overflow <= 1,
            `${lang} ${width} ${side} ${model.id}: overflow`,
          );
          assert.ok(
            g.offset < 1,
            `${lang} ${width} ${side} ${model.id}: controls misaligned ${g.offset}`,
          );
          assert.ok(Math.abs(g.cells[0].width - g.cells[1].width) < 1);
          report.states.push({ lang, width, side, model: model.id, ...g });
        }
      if ([375, 1440].includes(width)) {
        const axe = await new AxeBuilder({ page })
          .include(".product-comparison")
          .analyze();
        report.accessibility.push({ lang, width, violations: axe.violations });
        assert.deepEqual(axe.violations, []);
      }
      console.log(lang, width, "20 comparison changes passed");
      await context.close();
    }
  assert.deepEqual(report.errors, []);
} finally {
  await fs.writeFile(
    `${out}/comparison-regression.json`,
    JSON.stringify(report, null, 2),
  );
  await browser.close();
}
