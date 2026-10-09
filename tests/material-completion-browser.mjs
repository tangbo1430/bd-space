import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4322";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const report = { base, layouts: [], video: [], errors: [], missing: [] };
await mkdir("artifacts/material-completion", { recursive: true });
for (const lang of ["zh", "en"]) {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  let videoRequests = 0;
  page.on("request", (r) => {
    if (r.url().endsWith(".mp4")) videoRequests++;
  });
  page.on("pageerror", (e) => report.errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) report.missing.push(r.url());
  });
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    videoRequests = 0;
    await page.goto(`${base}/${lang}/products/4s/`, {
      waitUntil: "networkidle",
    });
    const link = page.locator('a[href="#installation-video"]');
    assert.equal(
      await link.textContent(),
      lang === "zh" ? "施工视频" : "Installation video",
    );
    assert.equal(videoRequests, 0, "No video bytes requested before playback");
    assert.equal(await page.locator("video").getAttribute("preload"), "none");
    assert.equal(await page.locator('[data-gallery="4s"]').count(), 14);
    for (const name of [
      "v11-catalog-1",
      "v11-catalog-2",
      "v11-4s-living-perspective",
    ]) {
      const imageLink = page.locator(
        `[data-gallery="4s"][data-gallery-source$="/${name}.webp"]`,
      );
      await imageLink.click();
      await page.locator(".viewer-image").evaluate((img) => img.decode());
      assert.equal(
        await page
          .locator(".viewer-image")
          .evaluate((img) => img.naturalWidth > 0),
        true,
      );
      await page.keyboard.press("Escape");
      assert(await imageLink.evaluate((el) => document.activeElement === el));
    }
    await link.click();
    assert.equal(
      await page.evaluate(() => location.hash),
      "#installation-video",
    );
    const video = page.locator("video");
    await video.scrollIntoViewIfNeeded();
    await video.click({ position: { x: 30, y: 30 } });
    await video.evaluate(async (el) => {
      el.muted = true;
      await el.play();
    });
    await page.waitForFunction(
      () => document.querySelector("video").currentTime > 0.2,
    );
    const state = await video.evaluate((el) => ({
      duration: el.duration,
      width: el.videoWidth,
      height: el.videoHeight,
      played: el.currentTime > 0,
      error: el.error?.message ?? null,
    }));
    assert.equal(state.width, 544);
    assert.equal(state.height, 960);
    assert(
      state.duration > 150 &&
        state.duration < 153 &&
        state.played &&
        !state.error,
    );
    await video.evaluate((el) => el.pause());
    report.video.push({ lang, width, ...state });
    await page
      .locator("#installation-video")
      .screenshot({
        path: `artifacts/material-completion/${lang}-video-${width}.png`,
      });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.goto(`${base}/${lang}/contact/`, { waitUntil: "networkidle" });
    assert(
      await page
        .getByText("112.662048° E / 22.432292° N", { exact: true })
        .isVisible(),
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    report.layouts.push({
      lang,
      width,
      videoAnchor: true,
      coordinates: true,
      overflow: false,
    });
  }
  await page.close();
}
await browser.close();
await writeFile(
  "artifacts/material-completion-browser-audit.json",
  JSON.stringify(report, null, 2),
);
assert.deepEqual(report.errors, []);
assert.deepEqual(report.missing, []);
console.log(
  "Four bilingual video playback and contact layout scenarios passed.",
);
