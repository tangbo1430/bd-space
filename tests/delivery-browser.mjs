/* global document, getComputedStyle, innerWidth, scrollTo */
import { chromium } from "playwright";
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4322";
const files = await readdir("dist", { recursive: true });
const routes = files
  .filter((f) => f.endsWith(".html"))
  .map((f) => "/" + f.replaceAll("\\", "/").replace(/index\.html$/, ""));
const sizes = [
  [320, 568],
  [375, 812],
  [768, 1024],
  [1024, 768],
  [1440, 900],
  [1920, 1080],
  [2560, 1440],
  [844, 390],
  [720, 450],
];
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ reducedMotion: "reduce" });
const report = {
  startedAt: new Date().toISOString(),
  version: JSON.parse(await readFile("dist/version.json", "utf8")),
  checks: [],
  errors: [],
  failures: [],
};
page.on("pageerror", (e) => report.errors.push(e.message));
await mkdir("artifacts/delivery-r26", { recursive: true });
for (const route of routes) {
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await page.goto(base + route, { waitUntil: route === "/" ? "networkidle" : "load" });
    await page.evaluate(async () => {
      await document.fonts.ready;
      for (const img of document.images) img.loading = "eager";
      await Promise.all(
        [...document.images].map((i) => i.decode().catch(() => {})),
      );
      for (const el of document.querySelectorAll(".rv")) el.classList.add("in");
    });
    // A responsive source can change after decode() starts. Wait for the final
    // request to settle; failed images still fail the naturalWidth check below.
    await page.waitForFunction(() => [...document.images].every((i) => i.complete));
    const result = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      broken: [...document.images]
        .filter((i) => !i.complete || !i.naturalWidth)
        .map((i) => i.currentSrc),
      images: [...document.querySelectorAll(".image-complete img")]
        .filter(
          (i) =>
            i.getBoundingClientRect().width > 0 &&
            getComputedStyle(i).visibility === "visible",
        )
        .map((i) => {
          const r = i.getBoundingClientRect(),
            p = i.parentElement.getBoundingClientRect();
          const expected =
            Number(i.getAttribute("width")) / Number(i.getAttribute("height"));
          return {
            src: i.currentSrc,
            ratioError: Math.abs(r.width / r.height / expected - 1),
            gap: Math.abs(p.height - r.height),
            transform: getComputedStyle(i).transform,
          };
        }),
      nav: [...document.querySelectorAll(".product-jump a")].map((a) => ({
        y: a.getBoundingClientRect().y,
        height: a.getBoundingClientRect().height,
      })),
    }));
    const issues = [];
    if (result.overflow) issues.push("horizontal overflow");
    if (result.broken.length) issues.push("broken images");
    if (
      result.images.some(
        (i) => i.ratioError > 0.007 || i.gap > 2 || i.transform !== "none",
      )
    )
      issues.push("body image proportions/gap/transform");
    if (
      result.nav.some(
        (i) => i.height < 44 || Math.abs(i.y - result.nav[0].y) > 1,
      )
    )
      issues.push("chapter navigation wrapped or undersized");
    if (issues.length)
      report.failures.push({ route, width, issues, ...result });
    report.checks.push({
      route,
      width,
      height,
      bodyImages: result.images.length,
    });
    if (!process.env.SKIP_SCREENSHOTS && [375, 1440].includes(width)) {
      // Reveal using the same scrolling path as a visitor before full-page capture.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 700) {
          scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 10));
        }
        scrollTo(0, 0);
      });
      await page.screenshot({
        path: `artifacts/delivery-r26/${route.replaceAll("/", "_")}-${width}.png`,
        fullPage: true,
      });
    }
  }
  console.log("audited", route);
}
report.finishedAt = new Date().toISOString();
await writeFile("artifacts/delivery-r26.json", JSON.stringify(report, null, 2));
await browser.close();
assert.deepEqual(report.failures, []);
assert.deepEqual(report.errors, []);
console.log(`${report.checks.length} delivery layout checks passed.`);


