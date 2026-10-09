import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const base = process.env.TEST_BASE_URL ?? "http://localhost:4322";
const output = new URL("../artifacts/supplement/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ reducedMotion: "reduce" });
const page = await context.newPage();
const report = { layouts: [], accessibility: [], interactions: [], errors: [] };
page.on("pageerror", (e) => report.errors.push(e.message));
const viewports = [
  [320, 568],
  [375, 812],
  [768, 1024],
  [1024, 768],
  [1440, 900],
  [1920, 1080],
  [844, 390],
  [720, 450],
];
for (const slug of ["4s", "grayscale"]) {
  const data = JSON.parse(
    (
      await readFile(
        new URL(`../src/content/products/${slug}.md`, import.meta.url),
        "utf8",
      )
    ).split("---")[1],
  );
  const expected = data.designGallery.length + data.gallery.length + 1;
  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height });
    await page.goto(`${base}/zh/products/${slug}/`, {
      waitUntil: "networkidle",
    });
    await page.evaluate(async () => {
      await document.fonts.ready;
      for (const img of document.images) img.loading = "eager";
      await Promise.all([...document.images].map((img) => img.decode()));
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 15));
      }
      scrollTo(0, 0);
    });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${slug} ${width} overflow`,
    );
    const pictures = await page
      .locator(".product-design-grid img, .technical-figure img")
      .evaluateAll((images) =>
        images.map((img) => {
          const rect = img.getBoundingClientRect();
          return {
            ratio: rect.width / rect.height,
            natural: img.naturalWidth / img.naturalHeight,
            complete: img.complete && img.naturalWidth > 0,
          };
        }),
      );
    assert(
      pictures.every((p) => p.complete && Math.abs(p.ratio - p.natural) < 0.01),
      "all new images loaded with their complete proportions",
    );
    const tiles = page.locator(".product-design-grid figure");
    assert.equal(await tiles.count(), 6);
    const first = await tiles.nth(0).boundingBox();
    const second = await tiles.nth(1).boundingBox();
    assert.equal(
      Math.abs(first.x - second.x) < 1,
      width < 768,
      "design gallery column count",
    );
    assert.equal(
      await page.locator(`[data-gallery="${slug}"]`).count(),
      expected,
    );
    await page.locator(".product-design").screenshot({
      path: fileURLToPath(new URL(`${slug}-design-${width}.png`, output)),
      style: "[data-gnb] { visibility: hidden !important; }",
    });
    await page.locator(".product-diagrams").screenshot({
      path: fileURLToPath(new URL(`${slug}-diagram-${width}.png`, output)),
      style: "[data-gnb] { visibility: hidden !important; }",
    });
    if ([375, 1440].includes(width)) {
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({
        path: fileURLToPath(new URL(`${slug}-full-${width}.png`, output)),
        fullPage: true,
      });
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      report.accessibility.push({
        slug,
        width,
        state: "page",
        violations: result.violations,
      });
    }
    const technical = page.locator(`[data-gallery="${slug}-diagrams"]`);
    await technical.click();
    await page.locator(".viewer-image").evaluate((e) => e.decode());
    assert.equal(
      await page.locator("[data-viewer-count]").textContent(),
      "01 / 01",
    );
    assert(await page.locator("[data-viewer-next]").isHidden());
    assert(
      (
        await page.locator("[data-viewer-original]").getAttribute("href")
      ).endsWith(".png"),
    );
    assert(
      (await page.locator("[data-viewer-caption]").textContent()).includes(
        "示意",
      ),
    );
    await page.locator("[data-viewer-zoom]").click();
    await page.waitForTimeout(50);
    if (slug === "grayscale" && width < 768) {
      const focalPoint = await page
        .locator("[data-viewer-image]")
        .evaluate(
          (mount) =>
            (mount.scrollLeft + mount.clientWidth / 2) / mount.scrollWidth,
        );
      assert(
        focalPoint < 0.35,
        "mobile zoom opens on the residential plan, not the central gutter",
      );
    }
    assert.equal(
      await page.locator("[data-viewer-zoom]").getAttribute("aria-pressed"),
      "true",
    );
    assert(
      await page
        .locator("[data-viewer-image]")
        .evaluate((e) => document.activeElement === e),
    );
    assert(
      await page
        .locator("[data-photo-viewer]")
        .evaluate(
          (e) => e.scrollWidth <= innerWidth && e.scrollHeight <= innerHeight,
        ),
    );
    if ([375, 1440].includes(width)) {
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      report.accessibility.push({
        slug,
        width,
        state: "diagram-zoom",
        violations: result.violations,
      });
    }
    await page.keyboard.press("Escape");
    assert(await technical.evaluate((e) => document.activeElement === e));
    await page.locator(`[data-gallery="${slug}"]`).last().click();
    await page.locator(".viewer-image").evaluate((e) => e.decode());
    const thumbnailSources = await page
      .locator("[data-viewer-thumbnails] img")
      .evaluateAll((images) => images.map((img) => img.getAttribute("src")));
    assert(
      thumbnailSources.every((src) => src.startsWith("/assets/thumbs/")),
      "gallery thumbnails never request full-size photographs",
    );
    assert.equal(
      await page.locator("[data-viewer-count]").textContent(),
      `${String(expected).padStart(2, "0")} / ${String(expected).padStart(2, "0")}`,
    );
    await page.keyboard.press("ArrowRight");
    assert.equal(
      await page.locator("[data-viewer-count]").textContent(),
      `01 / ${String(expected).padStart(2, "0")}`,
    );
    await page.keyboard.press("Escape");
    report.layouts.push({
      slug,
      width,
      height,
      images: 7,
      photoGroup: expected,
      diagramGroup: 1,
      overflow: false,
      proportions: true,
    });
  }
  report.interactions.push(
    `${slug}: correct image counts; technical group isolated; native original; zoom, focus restoration and gallery wrapping across eight viewports`,
  );
}
await browser.close();
await writeFile(
  new URL("../artifacts/supplement-browser-audit.json", import.meta.url),
  JSON.stringify(report, null, 2),
);
assert.equal(report.errors.length, 0);
assert(report.accessibility.every((a) => a.violations.length === 0));
console.log(
  `${report.layouts.length} supplement layouts and ${report.accessibility.length} accessibility scenarios passed.`,
);
