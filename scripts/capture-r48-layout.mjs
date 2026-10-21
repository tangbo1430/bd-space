/* global document, window, getComputedStyle */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const output = "artifacts/r48-layout/after";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = [];
try {
  for (const route of ["/zh/", "/en/", "/zh/products/", "/en/products/"]) {
    for (const width of [375, 1440, 1920]) {
      const page = await browser.newPage({
        viewport: {
          width,
          height: width === 375 ? 812 : width === 1440 ? 900 : 1080,
        },
        reducedMotion: "reduce",
      });
      await page.goto(`http://127.0.0.1:4322${route}`, {
        waitUntil: "networkidle",
      });
      await page.evaluate(async () => {
        await document.fonts.ready;
        for (const img of document.images) img.loading = "eager";
        await Promise.all(
          [...document.images].map((img) => img.decode().catch(() => {})),
        );
        document
          .querySelectorAll(".rv")
          .forEach((el) => el.classList.add("in"));
      });
      const layout = await page.evaluate(() => {
        const hero = document.querySelector("[data-carousel]");
        const firstImage = document.querySelector(
          ".h-tile-img, .catalog-feature-image",
        );
        return {
          height: document.documentElement.scrollHeight,
          firstProductDistance: Math.round(
            firstImage.getBoundingClientRect().top -
              hero.getBoundingClientRect().bottom,
          ),
          gutter: getComputedStyle(
            document.querySelector(".h40"),
          ).getPropertyValue("--content-inset"),
          sections: [...document.querySelectorAll(".h-sec")].map((el) => ({
            label: el.querySelector("h2")?.textContent,
            padding: getComputedStyle(el).paddingBlockStart,
          })),
        };
      });
      const file = route.replaceAll("/", "_") + "-" + width;
      const dots = page.locator("[data-dot]");
      for (let index = 0; index < (await dots.count()); index++) {
        await dots.nth(index).click();
        await page.waitForFunction(
          (i) =>
            document
              .querySelector(`[data-dot="${i}"]`)
              .classList.contains("on"),
          index,
        );
        await page.locator(".slide.on img").evaluate((img) => img.decode());
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(150);
        await page.screenshot({
          path: `${output}/${file}-slide${index}.jpg`,
          quality: 86,
        });
      }
      await dots.first().click();
      await page.waitForFunction(() =>
        document.querySelector('[data-dot="0"]').classList.contains("on"),
      );
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(150);
      await page.screenshot({
        path: `${output}/${file}-full.jpg`,
        fullPage: true,
        quality: 82,
      });
      await page.screenshot({
        path: `${output}/${file}-fold.jpg`,
        quality: 88,
      });
      const products = page.locator(".h-products, .collection-catalog");
      await products.screenshot({
        path: `${output}/${file}-products.jpg`,
        quality: 85,
      });
      results.push({ route, width, ...layout });
      await page.close();
      console.log(`${route} ${width}`);
    }
  }
} finally {
  await browser.close();
}
await writeFile(`${output}/layout.json`, JSON.stringify(results, null, 2));
