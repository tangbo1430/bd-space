/* global document, window, getComputedStyle */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4336";
const output = process.env.REVIEW_OUTPUT ?? "artifacts/r75-header/local";
const widths = process.env.HEADER_WIDTHS
  ? process.env.HEADER_WIDTHS.split(",").map(Number)
  : [320, 375, 768, 1024, 1280, 1440, 1920, 2560];
await mkdir(output, { recursive: true });
const report = { base, pages: [], frames: [], errors: [] };
const browser = await chromium.launch({ channel: "msedge", headless: true });

async function measure(page) {
  return page.evaluate(() => {
    const header = document.querySelector(".gnb");
    const brand = header.querySelector(".official-brand");
    return {
      header: header.getBoundingClientRect().toJSON(),
      logo: brand.getBoundingClientRect().toJSON(),
      originalVisible:
        getComputedStyle(brand.querySelector(".brand-original")).visibility ===
        "visible",
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      brokenImages: [...header.querySelectorAll("img")].filter(
        (img) => !img.complete || !img.naturalWidth,
      ).length,
    };
  });
}

function compare(actual, expected, label) {
  for (const element of ["header", "logo"])
    for (const key of ["x", "y", "width", "height"])
      assert.ok(
        Math.abs(actual[element][key] - expected[element][key]) < 0.6,
        `${label}: ${element}.${key} ${actual[element][key]} vs ${expected[element][key]}`,
      );
  assert.ok(actual.overflow <= 1, `${label}: horizontal overflow`);
  assert.equal(actual.brokenImages, 0, `${label}: broken logo`);
}

try {
  for (const lang of ["zh", "en"])
    for (const width of widths) {
      const page = await browser.newPage({
        viewport: { width, height: width <= 375 ? 812 : 1000 },
        reducedMotion: "reduce",
      });
      page.on("pageerror", (error) => report.errors.push(error.message));
      const reference = {};
      const routes = process.env.HEADER_CATALOG_ONLY
        ? ["", "products/"]
        : ["", "products/", "products/4s/", "cases/", "about/", "contact/"];
      if (lang === "zh" && !process.env.HEADER_CATALOG_ONLY)
        routes.push("qualifications/");
      for (const route of routes) {
        const path = `/${lang}/${route}`;
        const response = await page.goto(`${base}${path}`, {
          waitUntil: "domcontentloaded",
        });
        assert.equal(response.status(), 200, path);
        await page.evaluate(() => document.fonts.ready);
        await page.locator(".gnb .brand-original").evaluate((img) => img.decode());
        for (const scrollY of [0, 400]) {
          await page.evaluate((y) => window.scrollTo(0, y), scrollY);
          await page.waitForTimeout(250);
          const geometry = await measure(page);
          if (!route) reference[scrollY] = geometry;
          compare(geometry, reference[scrollY], `${path} ${width}px scroll=${scrollY}`);
          if (scrollY) assert.ok(geometry.originalVisible, `${path}: solid header logo`);
          report.pages.push({ path, width, scrollY, ...geometry });
        }
        if (route === "products/" && [375, 1440, 1920].includes(width)) {
          for (let index = 0; index < 4; index++) {
            await page.locator(`[data-dot="${index}"]`).click();
            await page.waitForFunction(
              (i) => document.querySelector(`[data-dot="${i}"]`).classList.contains("on"),
              index,
            );
            await page.locator(".slide.on img").evaluate((img) => img.decode());
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.waitForTimeout(250);
            const geometry = await measure(page);
            compare(geometry, reference[0], `${path} ${width}px slide=${index}`);
            assert.equal(
              geometry.originalVisible,
              width < 1280 || index < 2,
              `${path} ${width}px slide=${index}: wordmark background adaptation`,
            );
            report.frames.push({ path, width, index, ...geometry });
            await page.screenshot({
              path: `${output}/${lang}-products-${width}-slide-${index + 1}.jpg`,
              quality: 82,
            });
          }
        }
      }
      await page.close();
    }
  assert.deepEqual(report.errors, []);
} finally {
  await browser.close();
  await writeFile(`${output}/results.json`, JSON.stringify(report, null, 2));
}
console.log(`Header consistency: ${report.pages.length} page states, ${report.frames.length} carousel frames passed.`);
