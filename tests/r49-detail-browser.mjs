/* global document, window */
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4322";
const output = "artifacts/r49-implementation/detail";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const report = { layouts: [], interactions: [], accessibility: [], errors: [] };
const viewports = [
  [320, 740],
  [375, 812],
  [768, 1024],
  [1024, 768],
  [1440, 900],
  [1920, 1080],
  [2560, 1440],
  [844, 390],
  [720, 450],
];
try {
  for (const lang of ["zh", "en"])
    for (const [width, height] of viewports) {
      const context = await browser.newContext({
        viewport: { width, height },
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`${base}/${lang}/products/4s/`, {
        waitUntil: "networkidle",
      });
      await page.evaluate(async () => {
        await document.fonts.ready;
        for (const img of document.images) img.loading = "eager";
        await Promise.all(
          [...document.images].map((img) => img.decode().catch(() => {})),
        );
        document.querySelectorAll(".rv").forEach((e) => e.classList.add("in"));
      });
      await page.waitForFunction(() =>
        [...document.querySelectorAll(".product-detail img")].every(
          (img) => img.complete && img.naturalWidth > 0,
        ),
      );
      await page.waitForTimeout(200);
      const evidence = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        copyAbovePhoto:
          document.querySelector(".cover-body > p").getBoundingClientRect()
            .bottom <=
          document.querySelector(".page-visual-frame").getBoundingClientRect()
            .top +
            1,
        images: [
          ...document.querySelectorAll(".product-detail img:not(.ui-icon)"),
        ].map((img) => {
          const r = img.getBoundingClientRect();
          return {
            src: img.getAttribute("src"),
            loaded: img.complete && img.naturalWidth > 0,
            heightError: Math.abs(
              r.height -
                (r.width * Number(img.getAttribute("height"))) /
                  Number(img.getAttribute("width")),
            ),
          };
        }),
        rows: [
          ...document.querySelectorAll(".pd-tiles--complete .pd-tile-row"),
        ].map((row) =>
          [...row.querySelectorAll(".pd-tile-frame")].map((el) => {
            const r = el.getBoundingClientRect();
            const image = el.querySelector("img").getBoundingClientRect();
            return {
              x: r.x,
              y: r.y,
              height: r.height,
              gap: Math.abs(r.height - image.height),
            };
          }),
        ),
        videos: [...document.querySelectorAll("video")].map((v) => ({
          preload: v.preload,
          autoplay: v.autoplay,
          poster: !!v.poster,
          initialTime: v.currentTime,
        })),
      }));
      assert(evidence.overflow <= 1, `${lang}/${width}: overflow`);
      if (width < 768)
        assert(
          evidence.copyAbovePhoto,
          "Phone title precedes the complete photograph",
        );
      assert(
        evidence.images.every((i) => i.loaded && i.heightError < 1.5),
        `${lang}/${width}: complete images ${JSON.stringify(evidence.images.filter((i) => !i.loaded || i.heightError >= 1.5))}`,
      );
      for (const row of evidence.rows)
        for (const img of row) {
          assert(img.gap < 1.5, "Image frame hugs original image");
          if (width >= 768) {
            assert(Math.abs(img.y - row[0].y) < 1.5, "Rows start aligned");
            assert(
              Math.abs(img.height - row[0].height) < 1.5,
              "Same-height proportional row",
            );
          } else
            assert(Math.abs(img.x - row[0].x) < 1.5, "Mobile single column");
        }
      assert.equal(await page.locator("#spaces .pd-tile").count(), 6);
      assert(
        evidence.videos.every(
          (v) =>
            v.preload === "none" &&
            !v.autoplay &&
            v.poster &&
            v.initialTime === 0,
        ),
      );
      const path = `${output}/${lang}-${width}`;
      if ([375, 1440, 1920].includes(width)) {
        await page.screenshot({ path: `${path}-fold.jpg`, quality: 85 });
        await page.screenshot({
          path: `${path}-full.jpg`,
          quality: 78,
          fullPage: true,
        });
        await page
          .locator("#spaces")
          .screenshot({ path: `${path}-spaces.jpg`, quality: 85 });
        await page
          .locator("#specifications")
          .screenshot({ path: `${path}-spec.jpg`, quality: 85 });
      }
      if ([375, 1440].includes(width)) {
        const audit = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        report.accessibility.push({
          lang,
          width,
          violations: audit.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
        });
        const opener = page.locator('#spaces [data-gallery="4s"]').first();
        const groupCount = await page.locator('[data-gallery="4s"]').count();
        await opener.click();
        await page.locator(".viewer-image").evaluate((img) => img.decode());
        await page.locator("[data-viewer-zoom]").click();
        assert.equal(
          await page.locator("[data-viewer-zoom]").getAttribute("aria-pressed"),
          "true",
        );
        await page.locator("[data-viewer-zoom]").click();
        await page.locator("[data-viewer-thumbnails] button").first().click();
        await page.keyboard.press("ArrowLeft");
        await page.waitForFunction(
          (n) =>
            document
              .querySelector("[data-viewer-count]")
              ?.textContent?.trim()
              .startsWith(String(n).padStart(2, "0")),
          groupCount,
        );
        assert.equal(
          await page.locator("[data-viewer-thumbnails] button").count(),
          groupCount,
        );
        await page.keyboard.press("Escape");
        assert(
          await opener.evaluate((e) => e === document.activeElement),
          "Focus restored to source photo",
        );
        await page.locator('[data-gallery="4s-diagrams"]').first().click();
        const technicalCount = await page
          .locator('[data-gallery="4s-diagrams"]')
          .count();
        assert.equal(
          await page.locator("[data-viewer-thumbnails] button").count(),
          technicalCount,
        );
        await page.keyboard.press("Escape");
        await page.locator('.product-jump a[href="#spaces"]').click();
        const position = await page.locator("#design-heading").boundingBox();
        const navigation = await page.locator(".product-jump").boundingBox();
        assert(
          position.y >= navigation.y + navigation.height,
          "Anchor heading below sticky navigation",
        );
        const video = page.locator("video").first();
        await video.scrollIntoViewIfNeeded();
        await video.evaluate(async (v) => {
          v.muted = true;
          await v.play();
        });
        await page.waitForFunction(
          () => document.querySelector("video").currentTime > 0.1,
        );
        await video.evaluate((v) => v.pause());
        report.interactions.push({
          lang,
          width,
          zoom: true,
          wrap: true,
          focus: true,
          technicalGroup: true,
          anchor: true,
          manualVideo: true,
        });
      }
      assert.deepEqual(errors, []);
      report.layouts.push({ lang, width, height, ...evidence });
      await context.close();
    }
  assert(
    report.accessibility.every((a) => a.violations.length === 0),
    "Accessibility issues; see report",
  );
} catch (error) {
  report.errors.push(error.stack);
  process.exitCode = 1;
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify(report, null, 2));
  await browser.close();
  console.log(
    JSON.stringify(
      {
        layouts: report.layouts.length,
        interactions: report.interactions,
        accessibility: report.accessibility,
        errors: report.errors,
      },
      null,
      2,
    ),
  );
}
