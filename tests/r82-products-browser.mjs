/* global document, innerWidth */
import { chromium } from "playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4351";
const out = "artifacts/r82-products";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const report = { layouts: [], galleries: [], videos: [], errors: [] };
for (const lang of ["zh", "en"])
  for (const id of ["bd11", "qiyuan", "snow11"]) {
    const page = await browser.newPage({ reducedMotion: "reduce" });
    page.on("pageerror", (e) => report.errors.push(e.message));
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${base}/${lang}/products/${id}/`, {
        waitUntil: "networkidle",
      });
      await page.locator("#specifications").scrollIntoViewIfNeeded();
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      const text = await page.locator("main").innerText();
      if (lang === "en")
        assert(
          !/[\u3400-\u9fff]/.test(text),
          `${id} untranslated English body`,
        );
      const expected = {
        bd11: ["235.5", "127.2", "108.27", "217.4", "28.48"],
        qiyuan: ["133", "116.46", "29.13", "140mm"],
        snow11: ["145.6", "123.9", "72.2", "180mm"],
      };
      for (const number of expected[id])
        assert(text.includes(number), `${id} missing ${number}`);
      for (const image of await page.locator("#spaces img").all()) {
        await image.scrollIntoViewIfNeeded();
        await image.evaluate((e) => e.decode());
      }
      await page
        .locator("#spaces")
        .screenshot({ path: `${out}/${lang}-${id}-spaces-${width}.png` });
      const count = await page
        .locator(`[data-gallery="${id}-diagrams"]`)
        .count();
      assert.equal(count, { bd11: 10, qiyuan: 3, snow11: 2 }[id]);
      const rows = await page
        .locator(".pd-aligned-row")
        .evaluateAll((es) => es.map((e) => e.children.length));
      assert.deepEqual(
        rows,
        { bd11: [3, 2, 2, 2], qiyuan: [1, 1], snow11: [1] }[id],
      );
      report.layouts.push({ lang, id, width, diagramCount: count, rows });
    }
    const trigger = page.locator(`[data-gallery="${id}-diagrams"]`).first();
    await trigger.click();
    await page.locator(".viewer-image").evaluate((e) => e.decode());
    await page.locator("[data-viewer-zoom]").click();
    await page.keyboard.press("Escape");
    assert(await trigger.evaluate((e) => document.activeElement === e));
    report.galleries.push({ id, lang, zoomAndFocusRestored: true });
    await page.close();
  }
for (const id of ["bd11", "snow11"]) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  let requests = 0;
  page.on("request", (r) => {
    if (r.url().endsWith(".mp4")) requests++;
  });
  await page.goto(`${base}/zh/products/${id}/`, { waitUntil: "networkidle" });
  const v = page.locator("video");
  await v.scrollIntoViewIfNeeded();
  assert.equal(requests, 0);
  const bounds = await v.boundingBox();
  const ratio = await v.evaluate(
    (e) => Number(e.getAttribute("width")) / Number(e.getAttribute("height")),
  );
  assert(
    Math.abs(bounds.width / bounds.height - ratio) < 0.01,
    `${id}: video player must preserve landscape source ratio`,
  );
  await v.evaluate(async (e) => {
    e.muted = true;
    await e.play();
  });
  await page.waitForFunction(
    () => document.querySelector("video").currentTime > 0.2,
  );
  const duration = await v.evaluate((e) => e.duration);
  const frames = [];
  for (const fraction of [0.05, 0.5, 0.95]) {
    await v.evaluate(async (e, f) => {
      e.pause();
      e.currentTime = e.duration * f;
      await new Promise((resolve) =>
        e.addEventListener("seeked", resolve, { once: true }),
      );
    }, fraction);
    assert(
      Math.abs((await v.evaluate((e) => e.currentTime)) - duration * fraction) <
        0.25,
      `${id}: seek must reach requested frame`,
    );
    assert(await v.evaluate((e) => !e.error && e.videoWidth > 0));
    await v.screenshot({ path: `${out}/${id}-video-${fraction}.png` });
    frames.push(
      await v.evaluate((e) => ({
        time: e.currentTime,
        width: e.videoWidth,
        height: e.videoHeight,
      })),
    );
  }
  await v.evaluate((e) => e.requestFullscreen());
  assert(await page.evaluate(() => !!document.fullscreenElement));
  await page.evaluate(() => document.exitFullscreen());
  report.videos.push({
    id,
    duration,
    preplayRequests: 0,
    frames,
    pauseSeekFullscreen: true,
  });
  await page.close();
}
await browser.close();
assert.equal(report.errors.length, 0);
await fs.writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
