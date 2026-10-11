/* global document */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4322";
const output = process.env.REVIEW_OUTPUT ?? "artifacts/carousel-readiness";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = [];
for (const route of ["/zh/", "/zh/products/", "/en/", "/en/products/"]) {
  for (const width of [375, 1440]) {
    const viewport = { width, height: width === 375 ? 812 : 900 };
    const discovery = await browser.newPage({
      viewport,
      reducedMotion: "reduce",
    });
    await discovery.goto(base + route, { waitUntil: "networkidle" });
    const src = await discovery
      .locator("[data-slide] img")
      .nth(1)
      .evaluate((img) => img.currentSrc);
    await discovery.close();
    for (const scenario of ["ready", "cancel", "keyboard-race", "failure"]) {
      const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      let release;
      const gate = new Promise((resolve) => (release = resolve));
      await page.route(src, async (r) => {
        await gate;
        if (scenario === "failure") await r.abort();
        else await r.continue();
      });
      await page.goto(base + route, { waitUntil: "domcontentloaded" });
      await page
        .locator("[data-slide] img")
        .first()
        .evaluate((img) => img.decode());
      const dots = page.locator("[data-dot]");
      const active = () =>
        page.locator("[data-dot].on").getAttribute("data-dot");
      await dots.nth(1).click();
      await page.waitForTimeout(650);
      assert.equal(await active(), "0", "Retain photograph while loading");
      assert.equal(
        await page.locator("[data-carousel]").getAttribute("aria-busy"),
        "true",
      );
      assert(
        await page
          .locator("[data-slide].on img")
          .evaluate((img) => img.naturalWidth > 0),
      );
      if (scenario === "cancel") await dots.first().click();
      if (scenario === "keyboard-race") {
        await dots.nth(1).focus();
        await page.keyboard.press("ArrowRight");
        await page.waitForFunction(() =>
          document.querySelector('[data-dot="2"]').classList.contains("on"),
        );
        assert.equal(
          await page.locator(":focus").getAttribute("data-dot"),
          "2",
        );
      }
      if (scenario === "ready" && width === 1440 && route === "/zh/")
        await page.screenshot({ path: output + "/slow-retained.png" });
      release();
      await page.waitForFunction(
        () =>
          !document.querySelector("[data-carousel]").hasAttribute("aria-busy"),
      );
      await page.waitForLoadState("networkidle");
      const expected =
        scenario === "ready" ? "1" : scenario === "keyboard-race" ? "2" : "0";
      assert.equal(await active(), expected, "Latest selection wins");
      if (scenario === "failure") {
        assert.match(
          await page.locator("[data-banner-live]").textContent(),
          route.startsWith("/en/") ? /load/i : /无法加载/,
        );
        await dots.nth(2).click();
        assert.equal(
          await active(),
          "2",
          "Another image remains usable after failure",
        );
      }
      assert(
        await page
          .locator("[data-slide].on img")
          .evaluate((img) => img.naturalWidth > 0),
      );
      assert.equal(await page.locator("[data-slide]:not([inert])").count(), 1);
      assert.deepEqual(errors, []);
      results.push({ route, width, scenario, passed: true });
      await page.close();
    }
  }
}
await browser.close();
await writeFile(
  output + "/report.json",
  JSON.stringify({ base, results }, null, 2),
);
console.log(
  `${results.length} delayed-image, cancellation, keyboard-race and failure scenarios passed`,
);
