/* global document, window */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = [];
try {
  for (const route of ["/zh/", "/en/", "/zh/products/", "/en/products/"])
    for (const width of [375, 1440]) {
      const page = await browser.newPage({
        viewport: { width, height: 900 },
        reducedMotion: "reduce",
      });
      await page.goto("http://127.0.0.1:4322" + route, {
        waitUntil: "networkidle",
      });
      await page.evaluate(async () => {
        await document.fonts.ready;
        for (const img of document.images) img.loading = "eager";
        await Promise.all(
          [...document.images].map((img) => img.decode().catch(() => {})),
        );
      });
      const data = await page.evaluate(() => ({
        broken: [...document.images]
          .filter((i) => !i.complete || !i.naturalWidth)
          .map((i) => i.src),
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        cards: [...document.querySelectorAll(".h-tile,.catalog-feature")].map(
          (card) => {
            const frame = card.querySelector(
                ".h-tile-img,.catalog-feature-image",
              ),
              img = frame.querySelector("img"),
              r = img.getBoundingClientRect(),
              f = frame.getBoundingClientRect(),
              c = card.getBoundingClientRect();
            return {
              topGap: Math.abs(f.top - c.top),
              frameGap: Math.abs(f.height - r.height),
              ratioError: Math.abs(
                r.height - (r.width * img.naturalHeight) / img.naturalWidth,
              ),
            };
          },
        ),
        mobileLanguage: document
          .querySelector(".mobile-language")
          ?.getAttribute("href"),
        heroAction: document
          .querySelector(".hero-action a")
          ?.getAttribute("href"),
      }));
      assert.equal(data.broken.length, 0);
      assert(data.overflow <= 1);
      assert(
        data.cards.every(
          (c) => c.topGap < 1 && c.frameGap < 1 && c.ratioError < 1.5,
        ),
        "Cards hug complete images without top gaps",
      );
      assert.equal(
        data.mobileLanguage,
        route.replace(
          route.startsWith("/zh/") ? "/zh/" : "/en/",
          route.startsWith("/zh/") ? "/en/" : "/zh/",
        ),
      );
      assert(data.heroAction);
      results.push({ route, width, ...data });
      await page.close();
    }
} finally {
  await writeFile(
    "artifacts/r49-implementation/content-results.json",
    JSON.stringify(results, null, 2),
  );
  await browser.close();
}
console.log(`${results.length} content layouts passed`);
