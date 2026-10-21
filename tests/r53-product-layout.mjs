/* global document, innerWidth */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:4322";
const out = "artifacts/r53-implementation/product-layout";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = [];
try {
  for (const lang of ["zh", "en"])
    for (const width of [
      320, 375, 768, 1024, 1280, 1440, 1920, 2560, 844, 720,
    ]) {
      const page = await browser.newPage({
        viewport: { width, height: 900 },
        reducedMotion: "reduce",
      });
      page.setDefaultTimeout(15000);
      await page.goto(`${base}/${lang}/`, { waitUntil: "networkidle" });
      await page.locator(".h-tile:last-child").scrollIntoViewIfNeeded();
      await page.locator(".h-tile img").evaluateAll((imgs) =>
        Promise.all(
          imgs.map((i) => {
            i.loading = "eager";
            return i.decode();
          }),
        ),
      );
      const cards = await page.locator(".h-tile").evaluateAll((els) =>
        els.map((el) => {
          const image = el.querySelector("img"),
            r = image.getBoundingClientRect(),
            title = el.querySelector("h3").getBoundingClientRect(),
            card = el.getBoundingClientRect();
          return {
            left: r.left,
            titleLeft: title.left,
            width: r.width,
            height: r.height,
            cardWidth: card.width,
            frameWidth: el.querySelector(".h-tile-img").getBoundingClientRect()
              .width,
            crop: Math.abs(
              r.height - (r.width * image.naturalHeight) / image.naturalWidth,
            ),
          };
        }),
      );
      assert.equal(cards.length, 5);
      assert(
        cards.every((c) => c.crop < 1 && Math.abs(c.width - c.frameWidth) < 1),
        "Complete images fill each product card",
      );
      if (width < 768 || width >= 1024)
        assert(
          cards.every((c) => Math.abs(c.left - c.titleLeft) < 1),
          "All five product captions align with their images",
        );
      if (width >= 1024)
        assert(
          Math.max(...cards.slice(2).map((c) => c.width)) -
            Math.min(...cards.slice(2).map((c) => c.width)) <
            1,
          "4S/5S/6S have equal weight",
        );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      if ([320, 375, 1440].includes(width))
        await page.screenshot({
          path: `${out}/${lang}-${width}-last-card.jpg`,
          type: "jpeg",
          quality: 90,
        });
      results.push({ lang, width, cards });
      await page.close();
    }
} finally {
  await browser.close();
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
}
console.log(
  `${results.length} layouts / ${results.length * 5} product cards passed`,
);
