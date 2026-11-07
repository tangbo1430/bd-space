/* global document, window */
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const base = process.env.TEST_URL || "http://127.0.0.1:4354";
const out = "artifacts/r86-scale";
await fs.mkdir(out, { recursive: true });
const report = {
  layouts: [],
  frames: [],
  interactions: [],
  accessibility: [],
  errors: [],
};
const browser = await chromium.launch({ channel: "msedge" });
try {
  for (const lang of ["zh", "en"]) {
    for (const [width, height] of [
      [320, 812],
      [375, 812],
      [768, 1024],
      [1024, 768],
      [1280, 800],
      [1440, 1000],
      [1920, 1080],
      [2560, 1440],
      [812, 375],
      [960, 540],
    ]) {
      const context = await browser.newContext({
        viewport: { width, height },
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      page.on("pageerror", (e) => report.errors.push(e.message));
      await page.goto(`${base}/${lang}/`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const homeHeight = await page
        .locator(".editorial-hero")
        .evaluate((e) => e.getBoundingClientRect().height);
      if (lang === "zh" && [375, 1440, 1920, 2560].includes(width)) {
        await page.locator(".slide.on img").evaluate((e) => e.decode());
        await page.screenshot({ path: `${out}/unchanged-home-${width}.png` });
      }
      await page.goto(`${base}/${lang}/products/`, {
        waitUntil: "networkidle",
      });
      await page.evaluate(() => document.fonts.ready);
      let firstHeight;
      for (let index = 0; index < 4; index++) {
        await page.locator("[data-dot]").nth(index).click();
        await page.waitForFunction(
          (i) =>
            document
              .querySelectorAll("[data-slide]")
              .item(i).classList.contains("on"),
          index,
        );
        await page.locator(".slide.on img").evaluate((e) => e.decode());
        await page.evaluate(() =>
          window.scrollTo({ top: 0, behavior: "instant" }),
        );
        const g = await page.evaluate(() => {
          const rect = (s) => {
            const r = document.querySelector(s).getBoundingClientRect();
            return {
              x: r.x,
              y: r.y,
              width: r.width,
              height: r.height,
              right: r.right,
              bottom: r.bottom,
            };
          };
          const img = document.querySelector(".slide.on img");
          return {
            hero: rect(".editorial-hero"),
            stage: rect(".hero-stage"),
            image: rect(".slide.on img"),
            title: rect(".hero-intro h1"),
            action: rect(".hero-action"),
            nav: rect(".gnb"),
            controls: rect(".hero-controls"),
            overflow: document.documentElement.scrollWidth - window.innerWidth,
            fit: window.getComputedStyle(img).objectFit,
            ratio: Number(img.getAttribute("width")) / Number(img.getAttribute("height")),
            src: img.currentSrc,
          };
        });
        assert.equal(g.hero.x, 0);
        assert.equal(g.hero.width, width);
        assert.ok(g.overflow <= 1);
        assert.ok(
          g.title.y >= g.nav.bottom - 1,
          "Heading must clear navigation",
        );
        assert.ok(
          g.action.bottom < g.hero.bottom,
          "Action stays within the hero",
        );
        assert.ok(
          g.src.includes(`r78-catalog-${index + 1}`),
          "Preserve the specified four images and order",
        );
        if (width >= 1280) {
          assert.ok(
            Math.abs(g.hero.height - homeHeight) < 1,
            "Catalog must match home hero height",
          );
          firstHeight ??= g.hero.height;
          assert.ok(
            Math.abs(g.hero.height - firstHeight) < 1,
            "All carousel frames keep a stable height",
          );
          assert.equal(g.fit, "cover");
          assert.ok(Math.abs(g.image.height - g.stage.height) < 1);
          assert.ok(g.controls.bottom <= g.hero.bottom);
        } else {
          assert.ok(
            Math.abs(g.image.width / g.image.height - g.ratio) < 0.005,
            "Mobile photographs remain uncropped",
          );
        }
        report.frames.push({ lang, width, height, index, ...g });
      }
      const intro = page.locator(".product-introduction");
      await intro.locator("img").evaluateAll((es) =>
        Promise.all(
          es.map((e) => {
            e.loading = "eager";
            return e.decode();
          }),
        ),
      );
      const introGeometry = await intro.evaluate((e) => {
        const section = e.getBoundingClientRect();
        return [
          ...e.querySelectorAll(".intro-understanding,.intro-definition"),
        ].map((el) => {
          const r = el.getBoundingClientRect();
          return {
            left: r.left - section.left,
            right: section.right - r.right,
            width: r.width,
          };
        });
      });
      for (const g of introGeometry) {
        assert.ok(Math.abs(g.left - g.right) < 1, "Introduction margins match");
        assert.ok(
          g.left <= 81 && g.right <= 81,
          "No nested capped container creates large side gaps",
        );
      }
      for (const img of await intro.locator("img").all()) {
        assert.ok(
          await img.evaluate(
            (e) =>
              Math.abs(
                e.getBoundingClientRect().width / e.getBoundingClientRect().height -
                  Number(e.getAttribute("width")) / Number(e.getAttribute("height")),
              ) < 0.01,
          ),
          "Introduction image proportions stay intact",
        );
      }
      if ([375, 1440, 1920].includes(width)) {
        const axe = await new AxeBuilder({ page })
          .include(".product-introduction")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        report.accessibility.push({ lang, width, violations: axe.violations });
        assert.equal(axe.violations.length, 0);
      }
      await page.locator("[data-dot]").first().click();
      await page.waitForFunction(() =>
        document.querySelector("[data-slide]").classList.contains("on"),
      );
      await page.locator("[data-dot]").first().focus();
      await page.keyboard.press("ArrowRight");
      await page.waitForFunction(() =>
        document.querySelectorAll("[data-slide]")[1].classList.contains("on"),
      );
      const pause = page.locator("[data-carousel-pause]");
      const before = await pause.getAttribute("aria-pressed");
      await pause.click();
      assert.notEqual(await pause.getAttribute("aria-pressed"), before);
      await pause.click();
      assert.equal(await pause.getAttribute("aria-pressed"), before);
      report.interactions.push({ lang, width, keyboard: true, pause: true });
      report.layouts.push({ lang, width, height, homeHeight, introGeometry });
      await context.close();
      console.log(lang, width, "pass");
    }
  }
  assert.deepEqual(report.errors, []);
} finally {
  await fs.writeFile(`${out}/regression.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
