import { chromium } from "playwright";
/* global document, getComputedStyle, innerWidth */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4322";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ reducedMotion: "reduce" });
const report = { checks: [], errors: [], missing: [] };
page.on("pageerror", (error) => report.errors.push(error.message));
page.on("response", (response) => {
  if (response.status() >= 400) report.missing.push(response.url());
});
await mkdir("artifacts/photography", { recursive: true });
const routes = [
  "",
  "products/",
  "products/4s/",
  "products/5s/",
  "products/6s/",
  "products/grayscale/",
  "products/bd8/",
  "products/bd9/",
  "about/",
];
for (const [width, height] of [
  [375, 812],
  [768, 1024],
  [1440, 900],
  [1920, 1080],
  [2393, 1100],
  [3440, 1440],
]) {
  await page.setViewportSize({ width, height });
  for (const lang of ["zh", "en"])
    for (const route of routes) {
      await page.goto(`${base}/${lang}/${route}`, { waitUntil: "networkidle" });
      const result = await page.evaluate(async () => {
        const root = document.querySelector(".editorial-hero, .cover-visual");
        const images = [...root.querySelectorAll(".editorial-image img")];
        await Promise.all(images.map((image) => image.decode()));
        const bounds = root.getBoundingClientRect();
        const gaps = images.map((image) => {
          const box = image.getBoundingClientRect(),
            style = getComputedStyle(image);
          const scale =
            style.objectFit === "contain"
              ? Math.min(
                  box.width / image.naturalWidth,
                  box.height / image.naturalHeight,
                )
              : Math.max(
                  box.width / image.naturalWidth,
                  box.height / image.naturalHeight,
                );
          return {
            horizontal: Math.max(
              0,
              bounds.width - Math.min(box.width, image.naturalWidth * scale),
            ),
            vertical: Math.max(
              0,
              bounds.height - Math.min(box.height, image.naturalHeight * scale),
            ),
            source: image.currentSrc,
          };
        });
        return {
          gaps,
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          width: bounds.width,
        };
      });
      assert.equal(result.overflow, false, `${lang}/${route} ${width}`);
      assert.ok(
        Math.abs(result.width - width) < 2,
        `Masthead must span viewport: ${lang}/${route} ${width}`,
      );
      assert.ok(
        result.gaps.every((gap) => gap.horizontal < 2 && gap.vertical < 2),
        JSON.stringify({ lang, route, width, ...result }),
      );
      report.checks.push({ lang, route, width, height, ...result });
      if (
        [375, 2393].includes(width) &&
        ["", "products/", "products/4s/", "about/"].includes(route)
      ) {
        await page.screenshot({
          path: `artifacts/photography/${lang}-${route.replaceAll("/", "-") || "home"}-${width}.png`,
        });
      }
    }
}
assert.deepEqual(report.errors, []);
assert.deepEqual(report.missing, []);
await browser.close();
await writeFile(
  "artifacts/photography-audit.json",
  JSON.stringify(report, null, 2),
);
console.log(
  `${report.checks.length} photographic coverage checks passed; no unpainted edges or browser errors.`,
);
