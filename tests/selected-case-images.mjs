/* global document, innerWidth, getComputedStyle, Image */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4322";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ reducedMotion: "reduce" });
const report = { base, checks: [], errors: [] };
page.on("pageerror", (error) => report.errors.push(error.message));
await mkdir("artifacts/selected-cases", { recursive: true });
for (const lang of ["zh", "en"]) {
  for (const [width, height] of [
    [320, 568],
    [375, 812],
    [768, 1024],
    [1024, 768],
    [1440, 900],
    [1920, 1080],
    [2560, 1440],
    [844, 390],
    [720, 450],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(`${base}/${lang}/`, { waitUntil: "networkidle" });
    const cards = page.locator(".selected-cases .case-card");
    assert.equal(await cards.count(), 2);
    for (const card of await cards.all()) {
      await card.scrollIntoViewIfNeeded();
      await card.locator("img").evaluate((img) => img.decode());
      await card.hover();
      await page.waitForTimeout(50);
      const geometry = await card.evaluate(async (el) => {
        const img = el.querySelector("img");
        // Read source pixels without srcset density rounding of naturalWidth.
        const source = new Image();
        source.src = img.currentSrc;
        await source.decode();
        const frame = el.querySelector(".case-image").getBoundingClientRect();
        const picture = img.getBoundingClientRect();
        return {
          naturalRatio: source.naturalWidth / source.naturalHeight,
          frameRatio: frame.width / frame.height,
          renderedRatio: picture.width / picture.height,
          gapX: frame.width - picture.width,
          gapY: frame.height - picture.height,
          transform: getComputedStyle(img).transform,
          href: el.getAttribute("href"),
        };
      });
      assert(
        Math.abs(geometry.frameRatio - geometry.naturalRatio) < 0.002,
        `frame must follow the original image ratio: ${lang} ${width} ${JSON.stringify(geometry)}`,
      );
      assert(
        Math.abs(geometry.renderedRatio - geometry.naturalRatio) < 0.002,
        "no image crop or distortion",
      );
      assert(
        Math.abs(geometry.gapX) < 1 && Math.abs(geometry.gapY) < 1,
        "no padding bands inside the image frame",
      );
      assert.equal(
        geometry.transform,
        "none",
        "hover must not crop original image edges",
      );
      assert(geometry.href.startsWith(`/${lang}/cases/#`));
    }
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    if ([375, 1920].includes(width))
      await page
        .locator(".selected-cases")
        .screenshot({ path: `artifacts/selected-cases/${lang}-${width}.png` });
    report.checks.push({
      lang,
      width,
      height,
      cards: 2,
      originalRatio: true,
      noBands: true,
      noHoverCrop: true,
    });
  }
}
await browser.close();
assert.deepEqual(report.errors, []);
await writeFile(
  "artifacts/selected-case-images-audit.json",
  JSON.stringify(report, null, 2),
);
console.log(
  `${report.checks.length} bilingual viewport checks passed: original images, no cropping or image-frame gaps.`,
);
