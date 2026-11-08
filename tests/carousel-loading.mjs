/* global document, location */
import { chromium } from "playwright";
import assert from "node:assert/strict";

const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4360";
const browser = await chromium.launch({ channel: "msedge" });
try {
  for (const lang of ["zh", "en"]) {
    for (const suffix of ["", "products/"]) {
      const page = await browser.newPage({
        viewport: { width: 1920, height: 1080 },
        reducedMotion: "reduce",
      });
      const initialRequests = [];
      page.on("request", (request) => initialRequests.push(request.url()));
      // Read the exact fourth photo, then hold its request on a fresh visit.
      await page.goto(`${base}/${lang}/${suffix}`, {
        waitUntil: "domcontentloaded",
      });
      const target = await page
        .locator("[data-slide] img")
        .nth(3)
        .evaluate(
          (e) =>
            new URL(
              e.currentSrc ||
                e
                  .closest("picture")
                  .querySelector('source[media="(min-width: 1280px)"]')
                  ?.srcset ||
                e.src,
              location.href,
            ).href,
        );
      await page
        .locator("[data-slide] img")
        .first()
        .evaluate((e) => e.decode());
      await page.waitForTimeout(500);
      assert(
        !initialRequests.includes(target),
        "Never-viewed photo must not compete with the first frame",
      );
      let release;
      const held = new Promise((resolve) => {
        release = resolve;
      });
      await page.route(target, async (route) => {
        await held;
        await route.continue();
      });
      await page.reload({ waitUntil: "domcontentloaded" });
      const hero = page.locator("[data-carousel]");
      const targetImage = page.locator("[data-slide] img").nth(3);
      await page.locator("[data-dot]").nth(3).click();
      await page.waitForFunction(
        () =>
          document
            .querySelector("[data-carousel]")
            .getAttribute("aria-busy") === "true",
      );
      assert.equal(await targetImage.getAttribute("fetchpriority"), "high");
      assert(
        await page
          .locator("[data-slide]")
          .first()
          .evaluate((e) => e.classList.contains("on")),
      );
      // A different selection cancels the pending transition, not the current photo.
      await page.locator("[data-dot]").first().click();
      assert.equal(await hero.getAttribute("aria-busy"), null);
      assert.equal(await targetImage.getAttribute("fetchpriority"), "low");
      await page.locator("[data-dot]").nth(3).click();
      release();
      await page.waitForFunction(() =>
        document.querySelectorAll("[data-slide]")[3].classList.contains("on"),
      );
      assert.equal(await hero.getAttribute("aria-busy"), null);
      assert.equal(await targetImage.getAttribute("fetchpriority"), "low");
      assert(
        await targetImage.evaluate((e) => e.complete && e.naturalWidth > 0),
      );
      await page.unroute(target);
      await page.route(target, (route) => route.abort("failed"));
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.locator("[data-dot]").nth(3).click();
      await page.waitForFunction(
        () =>
          document
            .querySelector("[data-banner-live]")
            .textContent.includes("无法加载") ||
          document
            .querySelector("[data-banner-live]")
            .textContent.includes("could not be loaded"),
      );
      assert(
        await page
          .locator("[data-slide]")
          .first()
          .evaluate((e) => e.classList.contains("on")),
      );
      assert.equal(await hero.getAttribute("aria-busy"), null);
      await page.locator("[data-dot]").nth(1).click();
      await page.waitForFunction(() =>
        document.querySelectorAll("[data-slide]")[1].classList.contains("on"),
      );
      console.log(
        `PASS ${lang}/${suffix}: requested priority, loading guard, cancellation, error recovery`,
      );
      await page.close();
    }
  }
} finally {
  await browser.close();
}
