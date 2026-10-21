/* global document, window, getComputedStyle */
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const out =
  process.env.REVIEW_OUTPUT ?? "artifacts/r57-refinement/verification";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4322";
await mkdir(out, { recursive: true });
const report = {
  layouts: [],
  states: [],
  interactions: [],
  axe: [],
  errors: [],
};
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  for (const lang of ["zh", "en"])
    for (const [width, height] of [
      [320, 740],
      [375, 812],
      [768, 1024],
      [1024, 768],
      [1280, 900],
      [1440, 1000],
      [1920, 1080],
      [2560, 1440],
      [844, 390],
      [720, 450],
    ]) {
      const context = await browser.newContext({
        viewport: { width, height },
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      page.on("pageerror", (error) => report.errors.push(error.message));
      await page.goto(`${base}/${lang}/products/`, {
        waitUntil: "networkidle",
      });
      await page.evaluate(() => document.fonts.ready);
      const initialNav = await page
        .locator(".desktop-navigation")
        .boundingBox();
      for (const index of [0, 1, 2, 3, 0]) {
        await page.locator(`[data-dot="${index}"]`).click();
        await page.waitForFunction(
          (i) =>
            document
              .querySelector(`[data-dot="${i}"]`)
              .classList.contains("on"),
          index,
        );
        await page.locator(".slide.on img").evaluate((img) => img.decode());
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(80);
        const state = await page.evaluate(() => {
          const hero = document.querySelector("[data-carousel]"),
            photo = hero.querySelector(".slide.on img"),
            header = document.querySelector(".gnb");
          const pr = photo.getBoundingClientRect(),
            stage = hero.querySelector(".hero-stage").getBoundingClientRect(),
            copy = hero.querySelector(".hero-content").getBoundingClientRect(),
            title = hero.querySelector("h1").getBoundingClientRect();
          return {
            overflow: document.documentElement.scrollWidth - window.innerWidth,
            src: photo.currentSrc,
            ratioError: Math.abs(
              pr.height - (pr.width * photo.naturalHeight) / photo.naturalWidth,
            ),
            gap: Math.abs(stage.height - pr.height),
            filter: getComputedStyle(photo).filter,
            overlay: getComputedStyle(
              hero.querySelector(".slide.on"),
              "::after",
            ).content,
            copy: copy.toJSON(),
            title: title.toJSON(),
            stage: stage.toJSON(),
            brand: header.dataset.brandTone,
            brandOriginal: getComputedStyle(
              header.querySelector(".brand-original"),
            ).visibility,
            brandReversed: getComputedStyle(
              header.querySelector(".brand-reversed"),
            ).visibility,
            photoInk: header.querySelectorAll("[data-photo-ink]").length,
            nav: header
              .querySelector(".desktop-navigation")
              .getBoundingClientRect()
              .toJSON(),
            letters: [...header.querySelectorAll(".nav-ink")].map((el) => ({
              color: getComputedStyle(el).color,
              shadow: getComputedStyle(el).textShadow,
              filter: getComputedStyle(el).filter,
              background: getComputedStyle(el).backgroundImage,
            })),
            controls: [...hero.querySelectorAll(".hero-controls button")].map(
              (el) => ({
                width: el.getBoundingClientRect().width,
                height: el.getBoundingClientRect().height,
                text: el.textContent.trim(),
              }),
            ),
          };
        });
        assert(state.overflow <= 1, `${lang} ${width}: no overflow`);
        assert(
          state.src.includes(`r4-catalog-photo-${index + 1}`),
          "PDF images and sequence retained",
        );
        assert(
          state.ratioError < 1 && state.gap < 1,
          "uncropped image, no internal filler bars",
        );
        assert.equal(state.filter, "none");
        assert.equal(state.overlay, "none");
        assert(
          state.controls.every(
            (c) => c.width >= 44 && c.height >= 44 && !c.text,
          ),
          "text-free accessible controls",
        );
        if (width >= 1280) {
          assert(
            state.copy.bottom < state.stage.bottom,
            "copy remains within the photo",
          );
          assert(state.title.top >= 80, "title clears navigation");
          assert(
            index === 0
              ? state.copy.left < width / 2
              : state.copy.left > width / 2,
            "per-photo text position",
          );
          assert.equal(state.brand, index >= 2 ? "light" : "dark");
          assert.equal(state.brandReversed, index >= 2 ? "visible" : "hidden");
          assert.equal(state.photoInk, 0);
          for (const property of ["x", "y", "width", "height"])
            assert(
              Math.abs(state.nav[property] - initialNav[property]) < 1,
              "navigation stays in place across catalog slides",
            );
          assert(
            state.letters.every(
              (el) =>
                el.color ===
                  (index === 2 ? "rgb(255, 255, 255)" : "rgb(24, 34, 30)") &&
                (el.shadow === "none") === (index !== 2) &&
                el.filter === "none" &&
                el.background === "none",
            ),
          );
        } else assert.equal(state.brandOriginal, "visible");
        report.states.push({ lang, width, index, ...state });
      }
      await page.locator('[data-dot="3"]').click();
      await page.locator("[data-carousel]").focus();
      await page.keyboard.press("ArrowRight");
      await page.waitForFunction(() =>
        document.querySelector('[data-dot="0"]').classList.contains("on"),
      );
      report.interactions.push(
        `${lang} ${width}: keyboard loop restores first-slide theme`,
      );
      if (width === 1440) {
        await page.locator('[data-dot="3"]').click();
        await page.evaluate(() => window.scrollTo(0, 150));
        await page.waitForTimeout(250);
        assert.equal(
          await page
            .locator(".gnb .brand-original")
            .evaluate((el) => getComputedStyle(el).visibility),
          "visible",
        );
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(250);
        assert.equal(
          await page
            .locator(".gnb .brand-reversed")
            .evaluate((el) => getComputedStyle(el).visibility),
          "visible",
        );
        report.interactions.push(
          `${lang}: scroll and restore official logo variants`,
        );
      }
      if (width === 375) {
        await page.locator("[data-drawer-open]").click();
        await page.keyboard.press("Escape");
        assert(
          await page
            .locator("[data-drawer-open]")
            .evaluate((el) => el === document.activeElement),
        );
        report.interactions.push(`${lang}: mobile menu and focus restoration`);
      }
      if ([1440, 375].includes(width)) {
        for (const path of [`/${lang}/products/`, `/${lang}/`]) {
          await page.goto(base + path, { waitUntil: "networkidle" });
          const scan = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze();
          report.axe.push({ path, width, violations: scan.violations });
          assert.equal(
            scan.violations.length,
            0,
            JSON.stringify(scan.violations.map((v) => v.id)),
          );
        }
      }
      report.layouts.push({ lang, width, height });
      await context.close();
    }
  assert.equal(report.errors.length, 0);
} finally {
  await browser.close();
  await writeFile(`${out}/catalog.json`, JSON.stringify(report, null, 2));
}
console.log(
  JSON.stringify({
    layouts: report.layouts.length,
    states: report.states.length,
    interactions: report.interactions.length,
    axe: report.axe.length,
    errors: report.errors,
  }),
);
