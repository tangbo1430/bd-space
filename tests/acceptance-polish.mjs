/* global getComputedStyle */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4322";
const dir = process.env.REVIEW_OUTPUT ?? "artifacts/acceptance-r29";
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ reducedMotion: "reduce" });
const report = { base, products: [], systems: [], timelines: [], errors: [] };
page.on("pageerror", (e) => report.errors.push(e.message));
const normalize = (s) => s.replace(/\s+/g, "");
const luminance = (rgb) =>
  rgb
    .map((v) => {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    })
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
for (const width of [320, 375, 768, 1440, 2560])
  for (const lang of ["zh", "en"]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${base}/${lang}/`, { waitUntil: "networkidle" });
    const data = JSON.parse(
      await page.locator("[data-products-json]").textContent(),
    );
    for (const product of data) {
      await page.locator(`[data-product-tab="${product.id}"]`).click();
      assert.equal(
        normalize(
          await page.locator("[data-product-description]").textContent(),
        ),
        normalize(product.desc),
      );
      for (const field of ["area", "layout"]) {
        const el = page.locator(`[data-product-${field}]`);
        assert.equal(
          normalize(await el.textContent()),
          normalize(product[field]),
        );
        assert(await el.evaluate((e) => e.scrollWidth <= e.clientWidth + 1));
        if (lang === "en")
          assert(!/[\u3400-\u9fff]/.test(await el.textContent()));
      }
      assert(
        (
          await page.locator("[data-product-link]").getAttribute("href")
        ).endsWith(`/products/${product.id}/`),
      );
      report.products.push({ width, lang, product: product.id });
    }
    await page.locator('[data-product-tab="4s"]').focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(
      await page
        .locator('[data-product-tab="5s"]')
        .getAttribute("aria-selected"),
      "true",
    );
    if ([375, 1440].includes(width)) {
      await page.locator('[data-product-tab="4s"]').click();
      await page.locator(".collection-info").scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${dir}/${lang}-${width}-summary.png` });
    }
    for (const system of ["panels", "modules", "hybrid"]) {
      await page.locator(`label[for="system-${system}"]`).click();
      const el = page.locator(
        `[data-system-figure="${system}"] figcaption small`,
      );
      assert(await el.isVisible());
      const color = await el.evaluate((e) => getComputedStyle(e).color);
      const rgb = color
        .match(/[\d.]+/g)
        .slice(0, 3)
        .map(Number);
      const ratio = (luminance(rgb) + 0.05) / (luminance([18, 57, 46]) + 0.05);
      assert(ratio >= 4.5, `dark caption ${width} ${lang}: ${ratio}`);
      report.systems.push({
        width,
        lang,
        system,
        color,
        conservativeContrast: ratio,
      });
    }
    if ([375, 1440].includes(width)) {
      await page.locator(".systems-section").scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${dir}/${lang}-${width}-systems.png` });
    }
    const steps = page.locator("[data-making-toggle]");
    await steps.nth(0).click();
    assert(
      await page
        .locator(".making-frame.active svg.assembly-drawing")
        .isVisible(),
    );
    if ([375, 1440].includes(width)) {
      await page.locator(".making-stage").scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${dir}/${lang}-${width}-design.png` });
    }
    await steps.nth(1).click();
    assert(
      (
        await page.locator(".making-frame.active img").getAttribute("src")
      ).includes("v11-factory"),
    );
    await steps.nth(2).click();
    assert(
      (
        await page.locator(".making-frame.active img").getAttribute("src")
      ).includes("flow-step06-crane-panel"),
    );
    await page.goto(`${base}/${lang}/about/`, { waitUntil: "networkidle" });
    const time = page.locator(".founder-copy time").filter({ hasText: "2018" });
    assert.equal(
      await time.evaluate((e) => getComputedStyle(e).whiteSpace),
      "nowrap",
    );
    assert(await time.evaluate((e) => e.scrollWidth <= e.clientWidth + 1));
    if ([375, 1440].includes(width)) {
      await page.locator(".founder-copy").scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${dir}/${lang}-${width}-timeline.png` });
    }
    report.timelines.push({ width, lang });
  }
await browser.close();
assert.deepEqual(report.errors, []);
await writeFile(`${dir}/focused.json`, JSON.stringify(report, null, 2));
console.log(
  "40 product selections, 30 dark diagram states, 10 bilingual timelines and design/manufacture/delivery switches passed.",
);
