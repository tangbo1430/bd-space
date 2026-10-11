/* global document, getComputedStyle, scrollTo */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4322";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const report = { checks: [], errors: [] };
const page = await browser.newPage({ reducedMotion: "reduce" });
page.on("pageerror", (e) => report.errors.push(e.message));
await mkdir("artifacts/desktop-header", { recursive: true });
for (const width of [375, 1024, 1280, 1920, 2560]) {
  await page.setViewportSize({ width, height: 900 });
  for (const lang of ["zh", "en"])
    for (const route of ["", "products/", "products/4s/", "about/"]) {
      await page.goto(`${base}/${lang}/${route}`, { waitUntil: "networkidle" });
      const before = await page.evaluate(() => {
        const header = document.querySelector("[data-gnb]"),
          hero = document.querySelector(".editorial-hero,.cover-visual"),
          logo = [...header.querySelectorAll("img")].find(
            (i) => getComputedStyle(i).visibility === "visible",
          );
        return {
          background: getComputedStyle(header).backgroundColor,
          color: getComputedStyle(header).color,
          top: hero.getBoundingClientRect().top,
          logo: logo.getAttribute("src"),
          filter: getComputedStyle(logo).filter,
          backing: getComputedStyle(logo.parentElement, "::before")
            .backgroundColor,
        };
      });
      assert.equal(
        before.background,
        width >= 1280 ? "rgba(0, 0, 0, 0)" : "rgb(255, 255, 255)",
      );
      assert.equal(before.top, width >= 1280 ? 0 : width < 768 ? 76 : 96);
      assert.equal(
        before.logo,
        width >= 1280
          ? "/assets/brand/logo-overlay-r28.svg"
          : "/assets/brand/logo-original-r26.svg",
      );
      assert.equal(before.filter, "none");
      if (width >= 1280) {
        assert.equal(before.color, "rgb(255, 255, 255)");
        assert.equal(before.backing, "rgba(0, 0, 0, 0)");
      }
      if (width === 1920 && lang === "zh" && ["", "products/"].includes(route))
        await page.screenshot({
          path: `artifacts/desktop-header/${route ? "catalog" : "home"}.png`,
        });
      await page.evaluate(() => scrollTo(0, 220));
      await page.waitForFunction(
        () =>
          document.querySelector("[data-gnb]").classList.contains("scrolled") &&
          getComputedStyle(document.querySelector("[data-gnb]"))
            .backgroundColor === "rgb(255, 255, 255)",
      );
      assert.equal(
        await page
          .locator("[data-gnb] .brand-original")
          .evaluate((i) => getComputedStyle(i).filter),
        "none",
      );
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForFunction(
        () =>
          !document.querySelector("[data-gnb]").classList.contains("scrolled"),
      );
      report.checks.push({ width, lang, route, ...before });
    }
}
for (const route of ["/zh/contact/", "/en/cases/"]) {
  await page.goto(base + route, { waitUntil: "networkidle" });
  assert.equal(
    await page
      .locator("[data-gnb]")
      .evaluate((h) => getComputedStyle(h).backgroundColor),
    "rgb(255, 255, 255)",
  );
}
assert.deepEqual(report.errors, []);
await browser.close();
await writeFile(
  "artifacts/desktop-header-audit.json",
  JSON.stringify(report, null, 2),
);
console.log(
  "40 responsive overlay/scroll/logo checks and 2 light-page checks passed.",
);
