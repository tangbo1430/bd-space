/* global document, window */
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const base = process.env.TEST_URL || "http://127.0.0.1:4354";
const out = "artifacts/r85-added-content";
const report = {
  layouts: [],
  frames: [],
  accessibility: [],
  interactions: [],
  errors: [],
};
const browser = await chromium.launch({ channel: "msedge" });
try {
  for (const lang of ["zh", "en"])
    for (const catalog of [false, true]) {
      for (const [width, height] of [
        [320, 812],
        [375, 812],
        [768, 1024],
        [1024, 768],
        [1280, 800],
        [1440, 1000],
        [1920, 1080],
        [2560, 1300],
        [812, 375],
        [960, 540],
      ]) {
        const context = await browser.newContext({
          viewport: { width, height },
          reducedMotion: "reduce",
        });
        const page = await context.newPage();
        page.on("pageerror", (e) => report.errors.push(e.message));
        await page.goto(`${base}/${lang}/${catalog ? "products/" : ""}`, {
          waitUntil: "networkidle",
        });
        await page.evaluate(() => document.fonts.ready);
        const sections = catalog
          ? [".product-introduction"]
          : [".wall-introduction", ".closing-artwork"];
        for (const selector of sections) {
          const section = page.locator(selector);
          await section.scrollIntoViewIfNeeded();
          await section.locator("img").evaluateAll(async (images) => {
            await Promise.all(
              images.map(async (img) => {
                img.loading = "eager";
                await img.decode();
              }),
            );
          });
          const geometry = await section.evaluate((el) => {
            const rect = el.getBoundingClientRect();
            const links = [...el.querySelectorAll(".closing-phone")].map(
              (a) => {
                const aRect = a.getBoundingClientRect(),
                  parent = a.closest("article").getBoundingClientRect();
                return aRect.right <= parent.right + 1;
              },
            );
            return {
              left: rect.left,
              right: rect.right,
              overflow:
                document.documentElement.scrollWidth - window.innerWidth,
              links,
            };
          });
          assert.ok(
            geometry.left >= -1 &&
              geometry.right <= width + 1 &&
              geometry.overflow <= 1,
            `${lang} ${width} ${selector} overflow`,
          );
          assert.ok(
            geometry.links.every(Boolean),
            `${lang} ${width} contact phone exceeds its column`,
          );
          if ([375, 1440].includes(width)) {
            const axe = await new AxeBuilder({ page })
              .include(selector)
              .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
              .analyze();
            report.accessibility.push({
              lang,
              catalog,
              width,
              selector,
              violations: axe.violations.map((v) => ({
                id: v.id,
                impact: v.impact,
                nodes: v.nodes.map((n) => n.target),
              })),
            });
            assert.equal(
              axe.violations.length,
              0,
              `${lang} ${width} ${selector} axe`,
            );
          }
        }
        if (catalog && [1280, 1440, 1920, 2560, 375].includes(width)) {
          for (const index of [1, 2]) {
            await page.locator("[data-dot]").nth(index).click();
            await page.waitForFunction(
              (i) =>
                document
                  .querySelectorAll("[data-slide]")
                  .item(i)
                  .classList.contains("on"),
              index,
            );
            await page.locator(".slide.on img").evaluate((img) => img.decode());
            await page.evaluate(() =>
              window.scrollTo({ top: 0, behavior: "instant" }),
            );
            const geometry = await page.evaluate(() => {
              const rect = (s) => {
                const r = document.querySelector(s).getBoundingClientRect();
                return { x: r.x, y: r.y, right: r.right, bottom: r.bottom };
              };
              return {
                title: rect(".hero-intro h1"),
                sub: rect(".h-hero-sub"),
                action: rect(".hero-action"),
                hero: rect(".editorial-hero"),
                nav: rect(".gnb"),
              };
            });
            assert.ok(geometry.title.y >= geometry.nav.bottom - 1);
            assert.ok(geometry.title.bottom <= geometry.sub.y + 1);
            assert.ok(geometry.action.bottom <= geometry.hero.bottom + 1);
            if (width >= 1280)
              assert.ok(
                geometry.title.x >= width * 0.77,
                "Copy should occupy the clear right-hand sky",
              );
            report.frames.push({ lang, width, index, ...geometry });
            await page.screenshot({
              path: `${out}/final-${lang}-${width}-banner-${index + 1}.png`,
            });
          }
        }
        if (!catalog && [375, 1440].includes(width)) {
          const qr = page.locator("[data-closing-qr]").first();
          await qr.click();
          await page.locator(".closing-qr-dialog[open]").waitFor();
          await page.keyboard.press("Escape");
          assert.equal(
            await page.locator(".closing-qr-dialog[open]").count(),
            0,
          );
          assert.ok(await qr.evaluate((e) => e === document.activeElement));
          const node = page.locator(".wall-connections .gallery-link").first();
          await node.click();
          await page
            .locator(".photo-viewer[open]")
            .waitFor({ timeout: 5000 })
            .catch(async () => {
              assert.ok((await page.locator("dialog[open]").count()) > 0);
            });
          await page.keyboard.press("Escape");
          assert.ok(await node.evaluate((e) => e === document.activeElement));
          report.interactions.push({ lang, width, qr: true, wallViewer: true });
        }
        report.layouts.push({ lang, catalog, width, height });
        await context.close();
        console.log(lang, catalog ? "catalog" : "home", width, "pass");
      }
    }
  assert.deepEqual(report.errors, []);
} finally {
  await fs.writeFile(`${out}/regression.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
