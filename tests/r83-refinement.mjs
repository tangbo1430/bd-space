/* global document, window, getComputedStyle, innerWidth */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
const base = process.env.BASE ?? "http://127.0.0.1:4354";
const out = "artifacts/r83-refinement";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = [],
  errors = [];
for (const lang of ["zh", "en"])
  for (const [width, height] of [
    [320, 812],
    [375, 812],
    [768, 1024],
    [1024, 768],
    [1440, 900],
    [1920, 900],
    [2560, 1300],
    [812, 375],
    [960, 540],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    const p = await context.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(`${base}/${lang}/`, { waitUntil: "domcontentloaded" });
    await p.evaluate(async () => {
      await document.fonts.ready;
      document.querySelectorAll("img").forEach((i) => (i.loading = "eager"));
      await Promise.all(
        [...document.images].map((i) => i.decode().catch(() => {})),
      );
    });
    const layout = await p.evaluate(() => {
      const box = (s) => document.querySelector(s).getBoundingClientRect();
      const h = box(".home-hero"),
        photos = [...document.querySelectorAll(".wall-photographs img")].map(
          (i) => i.getBoundingClientRect(),
        );
      return {
        width: innerWidth,
        heroHeight: h.height,
        heroWidth: h.width,
        overflow: document.documentElement.scrollWidth > innerWidth,
        broken: [...document.images].filter((i) => !i.naturalWidth).length,
        photoTops: photos.map((r) => r.top),
        photoBottoms: photos.map((r) => r.bottom),
        cta: getComputedStyle(document.querySelector(".project-cta"))
          .backgroundColor,
      };
    });
    assert.equal(layout.overflow, false);
    assert.equal(layout.broken, 0);
    assert.equal(layout.heroWidth, width);
    assert.equal(layout.cta, "rgb(245, 246, 244)");
    if (width >= 1280)
      assert.ok(
        Math.abs(
          layout.heroHeight -
            Math.max(width * 0.40625, Math.min(height, width * 0.568)),
        ) < 3,
      );
    if (width >= 768) {
      for (const i of [2, 3])
        assert.ok(
          Math.abs(layout.photoBottoms[1] - layout.photoBottoms[i]) < 2,
          "Photo row baseline",
        );
      for (const i of [5, 6])
        assert.ok(
          Math.abs(layout.photoBottoms[4] - layout.photoBottoms[i]) < 2,
          "Second photo row baseline",
        );
    }
    const nodes = p.locator('[data-gallery="wall-connections"]');
    assert.equal(await nodes.count(), 4);
    for (let n = 0; n < 4; n++)
      assert.match(
        await nodes.nth(n).getAttribute("data-gallery-source"),
        new RegExp(`r79-wall-node-${n}.webp$`),
      );
    if ([375, 1440, 1920].includes(width)) {
      await p.evaluate(() => window.scrollTo(0, 0));
      for (let n = 0; n < 5; n++) {
        await p.locator("[data-dot]").nth(n).click();
        await p.waitForFunction(
          (n) => document.querySelectorAll("[data-slide]").item(n)?.classList.contains("on"),
          n,
          { timeout: 20000 },
        );
        await p
          .locator(".home-hero")
          .screenshot({ path: `${out}/final-${lang}-hero-${width}-${n}.png` });
        assert.ok(
          Math.abs(
            (await p.locator(".home-hero").boundingBox()).height -
              layout.heroHeight,
          ) < 3,
          "Stable carousel height",
        );
      }
      await nodes.first().click();
      await p.waitForSelector("dialog.photo-viewer[open]");
      await p.keyboard.press("Escape");
      assert.equal(
        await nodes.first().evaluate((e) => document.activeElement === e),
        true,
      );
      for (const [name, selector] of [
        ["wall", ".wall-introduction"],
        ["ending", "#project-contact"],
      ])
        await p
          .locator(selector)
          .screenshot({ path: `${out}/final-${lang}-${name}-${width}.png` });
      const qr = p.locator("[data-closing-qr]").last();
      await qr.click();
      await p.waitForSelector(".closing-qr-dialog[open]");
      await p.keyboard.press("Escape");
      assert.equal(
        await qr.evaluate((e) => document.activeElement === e),
        true,
      );
      const axe = await new AxeBuilder({ page: p })
        .include(".wall-introduction")
        .include("#project-contact")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      assert.deepEqual(
        axe.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
        [],
      );
    }
    results.push({ lang, ...layout });
    console.log(lang, width, "pass");
    await context.close();
  }
assert.deepEqual(errors, []);
await fs.writeFile(
  `${out}/regression.json`,
  JSON.stringify({ results, errors }, null, 2),
);
await browser.close();
