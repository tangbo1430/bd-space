/* global getComputedStyle, DOMMatrixReadOnly, window */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4336",
  out = "artifacts/r59-refinement/behavior";
await mkdir(out, { recursive: true });
const report = { progress: [], touch: [], errors: [] };
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  for (const lang of ["zh", "en"])
    for (const suffix of ["", "products/"]) {
      const p = await browser.newPage({
        viewport: { width: 1920, height: 1080 },
        reducedMotion: "no-preference",
      });
      p.on("pageerror", (e) => report.errors.push(e.message));
      await p.goto(`${base}/${lang}/${suffix}`, { waitUntil: "networkidle" });
      const progress = () =>
        p
          .locator(".hero-scene.on [data-scene-progress]")
          .evaluate(
            (e) => new DOMMatrixReadOnly(getComputedStyle(e).transform).a,
          );
      const a = await progress();
      await p.waitForTimeout(350);
      assert((await progress()) > a + 0.025, "autoplay progresses");
      await p.locator("[data-carousel-pause]").click();
      await p.mouse.move(500, 100);
      await p.waitForTimeout(80);
      const paused = await progress();
      await p.waitForTimeout(350);
      assert(Math.abs((await progress()) - paused) < 0.01);
      await p.locator(".hero-scene.on").click();
      await p.mouse.move(500, 100);
      assert(
        Math.abs((await progress()) - paused) < 0.01,
        "current dot preserves timer",
      );
      await p.locator("[data-carousel-pause]").click();
      await p.mouse.move(500, 100);
      await p.waitForTimeout(350);
      assert((await progress()) > paused + 0.025);
      await p.evaluate(() => window.scrollTo(0, 2200));
      await p.waitForTimeout(150);
      const hidden = await progress();
      await p.waitForTimeout(350);
      assert(
        Math.abs((await progress()) - hidden) < 0.01,
        "offscreen stops timer",
      );
      await p.evaluate(() => window.scrollTo(0, 0));
      await p.waitForTimeout(350);
      assert((await progress()) > hidden + 0.025);
      await p.emulateMedia({ reducedMotion: "reduce" });
      await p.waitForTimeout(80);
      assert.equal(await progress(), 1);
      assert.equal(
        await p
          .locator(".hero-scene.on [data-scene-progress]")
          .evaluate((e) => e.getAnimations().length),
        0,
      );
      await p.locator('[data-dot="1"]').click();
      await p.waitForTimeout(150);
      assert(await p.locator('[data-dot="1"].on').count());
      assert.equal(
        await p
          .locator(".slide.on")
          .evaluate((e) => getComputedStyle(e).transitionDuration),
        "0s",
      );
      report.progress.push({ lang, suffix, passed: true });
      await p.close();
      const ctx = await browser.newContext({
          viewport: { width: 375, height: 812 },
          hasTouch: true,
          isMobile: true,
          reducedMotion: "reduce",
        }),
        touch = await ctx.newPage();
      await touch.goto(`${base}/${lang}/${suffix}`, {
        waitUntil: "networkidle",
      });
      const rect = await touch.locator(".hero-stage").boundingBox(),
        y = rect.y + rect.height / 2;
      const cdp = await ctx.newCDPSession(touch);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: 300, y }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: 90, y }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await touch.waitForFunction(() =>
        window.document
          .querySelector('[data-dot="1"]')
          .classList.contains("on"),
      );
      report.touch.push({ lang, suffix, passed: true });
      await ctx.close();
    }
  assert.deepEqual(report.errors, []);
} catch (e) {
  report.errors.push(e.stack);
  process.exitCode = 1;
} finally {
  await browser.close();
  await writeFile(`${out}/results.json`, JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report));
